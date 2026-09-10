import { json } from '@sveltejs/kit';
import { getSession, listMessageWindow } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const sessionId = url.searchParams.get('s') || '';
	const before = url.searchParams.get('before') || undefined;
	const session = sessionId ? await getSession(sessionId, locals.userId) : null;

	if (!session) {
		return json({ error: 'Biseda nuk u gjet.' }, { status: 404 });
	}

	return json(await listMessageWindow(session.id, before));
};
