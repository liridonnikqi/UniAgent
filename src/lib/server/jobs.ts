import { env } from '$env/dynamic/private';
import { streamStudentQuestion } from '$lib/chat';
import { addMessage, setSessionTitleFromFirstQuestion } from '$lib/server/db';
import type { ChatMessage } from '$lib/types';

type Job = {
	reply: string;
	promise: Promise<string>;
	listeners: Set<() => void>;
};

const jobs = new Map<string, Job>();

export function getReplyJob(sessionId: string) {
	return jobs.get(sessionId) ?? null;
}

export function startReplyJob(
	sessionId: string,
	userId: string,
	message: string,
	history: ChatMessage[],
	studentName: string,
	university: string
) {
	const existing = jobs.get(sessionId);
	if (existing) return existing;

	const listeners = new Set<() => void>();
	const job: Job = {
		reply: '',
		promise: Promise.resolve(''),
		listeners
	};

	job.promise = (async () => {
		try {
			for await (const chunk of streamStudentQuestion(
				message,
				history,
				env.OPENAI_API_KEY || '',
				env.OPENAI_BASE_URL,
				env.OPENAI_MODEL || 'gpt-4o-mini',
				studentName,
				university,
				Number(env.OPENAI_MAX_TOKENS) || 400,
				env.OPENAI_REASONING_EFFORT || 'low'
			)) {
				job.reply += chunk;
				for (const emit of listeners) emit();
			}

			if (job.reply) {
				await addMessage(userId, sessionId, 'assistant', job.reply);
				await setSessionTitleFromFirstQuestion(sessionId);
			}

			return job.reply;
		} finally {
			jobs.delete(sessionId);
		}
	})();

	jobs.set(sessionId, job);
	return job;
}
