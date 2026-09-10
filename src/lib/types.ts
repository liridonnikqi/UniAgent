export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
	role: ChatRole;
	content: string;
	id?: string;
	created_at?: string;
};

export type ChatSession = {
	id: string;
	title: string;
	updated_at: string;
};
