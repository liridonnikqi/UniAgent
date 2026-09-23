import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { ensureSchema } from '$lib/server/db';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	event.locals.userId = undefined;

	if (!building) {
		try {
			await ensureSchema();
			const current = await auth.api.getSession({ headers: event.request.headers });
			if (current) {
				event.locals.session = current.session;
				event.locals.user = current.user;
				event.locals.userId = current.user.id;
			}
		} catch (err) {
			console.error(err);
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
