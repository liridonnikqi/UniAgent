import type { Handle } from '@sveltejs/kit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handle: Handle = async ({ event, resolve }) => {
	let id = event.cookies.get('ua');

	if (!id || !UUID.test(id)) {
		id = crypto.randomUUID();
		event.cookies.set('ua', id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	event.locals.userId = id;
	return resolve(event);
};
