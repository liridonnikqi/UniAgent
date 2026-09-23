declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				name: string;
				email: string;
				university?: string | null;
			} | null;
			session: {
				id: string;
				userId: string;
			} | null;
			userId?: string;
		}
	}
}

export {};
