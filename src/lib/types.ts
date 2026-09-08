export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
	role: ChatRole;
	content: string;
};

export type ChatSession = {
	id: string;
	title: string;
	updated_at: string;
};
