import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { auth, authEnabled } from '$lib/server/auth';
import {
	createSession,
	deleteEmptySessions,
	deleteSession,
	ensureSchema,
	getSession,
	getUser,
	listMessageWindow,
	listSessions,
	saveProfile
} from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

function authErrorMessage(code: string | null) {
	if (!code) return '';
	if (code === '1' || code === 'access_denied') return 'Hyrja u anulua ose dështoi.';
	return 'Hyrja dështoi. Provo përsëri.';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const authError = authErrorMessage(
		url.searchParams.get('auth_error') || url.searchParams.get('error')
	);

	try {
		await ensureSchema();

		if (!locals.userId) {
			return {
				user: null,
				sessions: [],
				sessionId: '',
				messages: [],
				hasMore: false,
				dbError: '',
				auth: authEnabled,
				authError
			};
		}

		const user = await getUser(locals.userId);

		if (!user?.name || !user.university) {
			return {
				user,
				sessions: [],
				sessionId: '',
				messages: [],
				hasMore: false,
				dbError: '',
				auth: authEnabled,
				authError
			};
		}

		const requested = url.searchParams.get('s');
		if (!requested) {
			await deleteEmptySessions(locals.userId);
			const created = await createSession(locals.userId);
			redirect(303, `/?s=${created.id}`);
		}

		const owned = await getSession(requested, locals.userId);
		if (!owned) {
			await deleteEmptySessions(locals.userId);
			const created = await createSession(locals.userId);
			redirect(303, `/?s=${created.id}`);
		}

		const sessions = await listSessions(locals.userId);
		const window = await listMessageWindow(owned.id);

		return {
			user,
			sessions,
			sessionId: owned.id,
			messages: window.messages,
			hasMore: window.hasMore,
			dbError: '',
			auth: authEnabled,
			authError
		};
	} catch (err) {
		if (isRedirect(err)) throw err;
		console.error(err);
		return {
			user: null,
			sessions: [],
			sessionId: '',
			messages: [],
			hasMore: false,
			dbError:
				err instanceof Error
					? `Databaza nuk u lidh. ${err.message}`
					: 'Databaza nuk u lidh. Nis Postgres me: docker compose up -d',
			auth: authEnabled,
			authError
		};
	}
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Hyr fillimisht.' });
		}

		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const university = String(data.get('university') || '').trim();

		if (!name || !university) {
			return fail(400, { error: 'Shkruaj emrin dhe universitetin.', name, university });
		}

		await ensureSchema();
		await saveProfile(locals.userId, name, university);
		await deleteEmptySessions(locals.userId);
		const session = await createSession(locals.userId);
		redirect(303, `/?s=${session.id}`);
	},

	updateProfile: async ({ request, locals }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Hyr fillimisht.' });
		}

		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const university = String(data.get('university') || '').trim();

		if (!name || !university) {
			return fail(400, { error: 'Shkruaj emrin dhe universitetin.' });
		}

		await saveProfile(locals.userId, name, university);
		return { ok: true };
	},

	newChat: async ({ locals }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Hyr fillimisht.' });
		}

		await ensureSchema();
		await deleteEmptySessions(locals.userId);
		const session = await createSession(locals.userId);
		redirect(303, `/?s=${session.id}`);
	},

	deleteChat: async ({ request, locals, url }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Hyr fillimisht.' });
		}

		const id = String((await request.formData()).get('id') || '');
		const session = await getSession(id, locals.userId);
		if (!session) {
			return fail(404, { error: 'Biseda nuk u gjet.' });
		}

		await deleteSession(id, locals.userId);

		const remaining = await listSessions(locals.userId);
		if (remaining.length === 0) {
			const next = await createSession(locals.userId);
			redirect(303, `/?s=${next.id}`);
		}

		const wasOpen = url.searchParams.get('s') === id || !url.searchParams.get('s');
		if (wasOpen) {
			redirect(303, `/?s=${remaining[0].id}`);
		}

		return { ok: true };
	},

	logout: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
