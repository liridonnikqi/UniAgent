import { fail, redirect } from '@sveltejs/kit';
import {
	createSession,
	ensureSchema,
	ensureUser,
	getUser,
	listMessages,
	listSessions,
	saveProfile
} from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		await ensureSchema();
		await ensureUser(locals.userId);
		const user = await getUser(locals.userId);

		if (!user?.name) {
			return { user, sessions: [], sessionId: '', messages: [], dbError: '' };
		}

		let sessions = await listSessions(locals.userId);
		if (sessions.length === 0) {
			await createSession(locals.userId);
			sessions = await listSessions(locals.userId);
		}

		const requested = url.searchParams.get('s');
		const current =
			(requested ? sessions.find((item) => item.id === requested) : null) ?? sessions[0];

		const messages = current ? await listMessages(current.id) : [];

		return {
			user,
			sessions,
			sessionId: current?.id ?? '',
			messages,
			dbError: ''
		};
	} catch (err) {
		return {
			user: null,
			sessions: [],
			sessionId: '',
			messages: [],
			dbError: 'Databaza nuk u lidh. Nis Postgres me: docker compose up -d'
		};
	}
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const university = String(data.get('university') || '').trim();

		if (!name || !university) {
			return fail(400, { error: 'Shkruaj emrin dhe universitetin.' });
		}

		await ensureSchema();
		await ensureUser(locals.userId);
		await saveProfile(locals.userId, name, university);
		return { ok: true };
	},

	newChat: async ({ locals }) => {
		await ensureSchema();
		const session = await createSession(locals.userId);
		redirect(303, `/?s=${session.id}`);
	},

	logout: async ({ cookies }) => {
		cookies.delete('ua', { path: '/' });
		redirect(303, '/');
	}
};
