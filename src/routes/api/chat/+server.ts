import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { addMessage, getSession, getUser, listRecentMessages } from '$lib/server/db';
import { startReplyJob } from '$lib/server/jobs';
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

	const history = await listRecentMessages(session.id, 20);
	const last = history.at(-1);
	const alreadySaved = last?.role === 'user' && last.content === message;
	const historyForModel = alreadySaved ? history.slice(0, -1) : history;

	if (!alreadySaved) {
		await addMessage(locals.userId, session.id, 'user', message);
	}

	const job = startReplyJob(
		session.id,
		locals.userId,
		message,
		historyForModel,
		user.name,
		user.university
	);

	const encoder = new TextEncoder();

	const readable = new ReadableStream({
		async start(controller) {
			const push = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					// client left; generation still runs
				}
			};

			let sent = 0;
			const flush = () => {
				const next = job.reply.slice(sent);
				sent = job.reply.length;
				if (next) push(next);
			};

			job.listeners.add(flush);
			flush();

			try {
				await job.promise;
				flush();
			} catch (err) {
				try {
					controller.error(err);
				} catch {
					// ignore
				}
				return;
			} finally {
				job.listeners.delete(flush);
			}

			try {
				controller.close();
			} catch {
				// ignore
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
