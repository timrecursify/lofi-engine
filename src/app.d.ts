import type { DefaultSession } from '@auth/core/types';

declare global {
	namespace App {
		interface Error {}
		interface Locals {
			getSession(): Promise<DefaultSession | null>;
		}
		interface PageData {
			session: DefaultSession | null;
		}
		interface Platform {}
	}
}

declare module '@auth/core/types' {
	interface Session {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

export {}; 