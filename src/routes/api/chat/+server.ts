import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { streamStudentQuestion } from '$lib/chat';
import { addMessage, getSession, getUser, listMessages } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!env.OPENAI_API_KEY) {
		return json({ error: 'Missing OPENAI_API_KEY in .env' }, { status: 500 });
	}

	const user = await getUser(locals.userId);
	if (!user?.name || !user.university) {
		return json({ error: 'Plotëso emrin dhe universitetin fillimisht.' }, { status: 401 });
	}

	const body = await request.json();
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';

	if (!message) {
		return json({ error: 'Shkruaj një pyetje fillimisht.' }, { status: 400 });
	}

	const session = sessionId ? await getSession(sessionId, locals.userId) : null;
	if (!session) {
		return json({ error: 'Biseda nuk u gjet.' }, { status: 404 });
	}

	const history = await listMessages(session.id);
	await addMessage(locals.userId, session.id, 'user', message);

	const encoder = new TextEncoder();

	const readable = new ReadableStream({
		async start(controller) {
			let reply = '';

			try {
				for await (const chunk of streamStudentQuestion(
					message,
					history,
					env.OPENAI_API_KEY,
					env.OPENAI_BASE_URL,
					env.OPENAI_MODEL || 'gpt-4o-mini',
					user.name,
					user.university
				)) {
					reply += chunk;
					controller.enqueue(encoder.encode(chunk));
				}

				if (reply) {
					await addMessage(locals.userId, session.id, 'assistant', reply);
				}

				controller.close();
			} catch (err) {
				console.error(err);
				controller.error(err);
			}
		}
	});

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no'
		}
	});
};
