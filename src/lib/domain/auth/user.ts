export interface SessionUser {
	id: string;
	email: string | null;
	authProvider: 'email' | 'google';
	nickname: string;
	rankingOptIn: boolean;
	standupLeadMinutes: number;
}
