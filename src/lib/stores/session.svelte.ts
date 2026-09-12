import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import type { AuthOAuthProvider } from '$lib/domain/auth/credentials';
import type { AuthReturnPath } from '$lib/domain/auth/return-path';
import type { SessionUser } from '$lib/domain/auth/user';
import {
	scheduleStandupReminder,
	standupReminderCopy
} from '$lib/application/notify/standup-reminder';
import type { SavedTimeSummary } from '$lib/domain/commit/types';
import { onboardingSession } from '$lib/stores/onboarding.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';
import { tripSession } from '$lib/stores/trip-session.svelte';

class SessionStore {
	user = $state<SessionUser | null>(null);
	loaded = $state(false);
	commitIds = $state<string[]>([]);
	errorMessage = $state<string | null>(null);

	hasCommitFor(recommendationId: string | null): boolean {
		return Boolean(recommendationId && this.commitIds.includes(recommendationId));
	}

	async load(): Promise<void> {
		try {
			const payload = await readJson<{ user: SessionUser | null }>('/api/auth/me');
			this.user = payload.user;

			if (this.user) {
				onboardingSession.markCompleted();
				await settingsStore.saveStandupLeadMinutes(this.user.standupLeadMinutes);
				const summary = await fetch('/api/commits/summary');

				if (summary.ok) {
					const body = (await summary.json()) as { recommendationIds?: string[] };
					this.commitIds = body.recommendationIds ?? [];
				}
			}
		} catch (cause) {
			console.error('Session load failed', cause);
			this.user = null;
		} finally {
			this.loaded = true;
		}
	}

	async register(
		email: string,
		password: string,
		nickname: string
	): Promise<'ok' | 'pending' | 'error'> {
		this.errorMessage = null;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, nickname })
			});
			const payload = (await response.json()) as {
				user?: SessionUser;
				pendingVerification?: boolean;
				message?: string;
			};

			if (payload.pendingVerification) {
				return 'pending';
			}

			if (!response.ok || !payload.user) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.AUTH_INVALID;
				return 'error';
			}

			this.user = payload.user;
			onboardingSession.markCompleted();
			await settingsStore.saveStandupLeadMinutes(payload.user.standupLeadMinutes);
			return 'ok';
		} catch (cause) {
			console.error('Auth request failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return 'error';
		}
	}

	async login(email: string, password: string): Promise<boolean> {
		return this.submitAuth('/api/auth/login', { email, password });
	}

	async startOAuth(provider: AuthOAuthProvider, next: AuthReturnPath = '/'): Promise<void> {
		this.errorMessage = null;

		try {
			const response = await fetch('/api/auth/oauth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider, next })
			});
			const payload = (await response.json()) as { url?: string; message?: string };

			if (!response.ok || !payload.url) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.AUTH_UNAVAILABLE;
				return;
			}

			window.location.assign(payload.url);
		} catch (cause) {
			console.error('OAuth start failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
		}
	}

	async resendSignupEmail(email: string): Promise<boolean> {
		return this.postEmailAction({ email, type: 'signup' });
	}

	async requestPasswordReset(email: string): Promise<boolean> {
		return this.postEmailAction({ email, type: 'recovery' });
	}

	async updatePassword(password: string): Promise<boolean> {
		this.errorMessage = null;

		try {
			const response = await fetch('/api/auth/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			const payload = (await response.json()) as { ok?: boolean; message?: string };

			if (!response.ok || !payload.ok) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.INVALID_REQUEST;
				return false;
			}

			return true;
		} catch (cause) {
			console.error('Password update failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return false;
		}
	}

	async logout(): Promise<void> {
		await fetch('/api/auth/logout', { method: 'POST' });
		this.user = null;
		this.commitIds = [];
	}

	async saveProfile(patch: {
		nickname?: string;
		rankingOptIn?: boolean;
		standupLeadMinutes?: number;
	}): Promise<boolean> {
		this.errorMessage = null;

		try {
			const response = await fetch('/api/auth/me', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch)
			});
			const payload = (await response.json()) as { user?: SessionUser; message?: string };

			if (!response.ok || !payload.user) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.INVALID_REQUEST;
				return false;
			}

			this.user = payload.user;
			if (patch.standupLeadMinutes !== undefined) {
				await settingsStore.saveStandupLeadMinutes(payload.user.standupLeadMinutes);
			}
			return true;
		} catch (cause) {
			console.error('Profile update failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return false;
		}
	}

	async commitCurrentRecommendation(): Promise<boolean> {
		const result = tripSession.result;
		const trip = tripSession.trip;
		const displayed = tripSession.displayedRecommended();

		if (!result || !trip || !displayed) {
			return false;
		}

		if (!this.user) {
			await goto(resolve('/login'));
			return false;
		}

		this.errorMessage = null;

		try {
			const response = await fetch('/api/commits', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					recommendationId: result.id,
					criterion: tripSession.selectedCriterion
				})
			});
			const payload = (await response.json()) as {
				commit?: { recommendationId: string };
				message?: string;
			};

			if (!response.ok || !payload.commit) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.AUTH_REQUIRED;
				if (response.status === 401) {
					await goto(resolve('/login'));
				}
				return false;
			}

			this.commitIds = [...this.commitIds, payload.commit.recommendationId];
			await scheduleStandupReminder(standupReminderCopy(displayed.departureAt));
			await subscribeWebPush();
			return true;
		} catch (cause) {
			console.error('Commit failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return false;
		}
	}

	private async submitAuth(path: string, body: Record<string, string>): Promise<boolean> {
		this.errorMessage = null;

		try {
			const response = await fetch(path, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = (await response.json()) as { user?: SessionUser; message?: string };

			if (!response.ok || !payload.user) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.AUTH_INVALID;
				return false;
			}

			this.user = payload.user;
			onboardingSession.markCompleted();
			await settingsStore.saveStandupLeadMinutes(payload.user.standupLeadMinutes);
			return true;
		} catch (cause) {
			console.error('Auth request failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return false;
		}
	}

	private async postEmailAction(body: {
		email: string;
		type: 'signup' | 'recovery';
	}): Promise<boolean> {
		this.errorMessage = null;

		try {
			const response = await fetch('/api/auth/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const payload = (await response.json()) as { ok?: boolean; message?: string };

			if (!response.ok || !payload.ok) {
				this.errorMessage = payload.message ?? ERROR_USER_MESSAGES.AUTH_UNAVAILABLE;
				return false;
			}

			return true;
		} catch (cause) {
			console.error('Auth email action failed', cause);
			this.errorMessage = ERROR_USER_MESSAGES.NETWORK_ERROR;
			return false;
		}
	}
}

export const sessionStore = new SessionStore();

export async function fetchSavedSummary(): Promise<SavedTimeSummary | null> {
	const response = await fetch('/api/commits/summary');

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as { summary: SavedTimeSummary };
	return payload.summary;
}

async function readJson<T>(path: string): Promise<T> {
	const response = await fetch(path);
	return (await response.json()) as T;
}

async function subscribeWebPush(): Promise<void> {
	if (
		typeof navigator === 'undefined' ||
		!('serviceWorker' in navigator) ||
		!('PushManager' in window)
	) {
		return;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		const vapid = await readJson<{ publicKey: string | null }>('/api/push/vapid');

		if (!vapid.publicKey) {
			return;
		}

		const subscription =
			(await registration.pushManager.getSubscription()) ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource
			}));
		const json = subscription.toJSON();
		await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				endpoint: json.endpoint,
				p256dh: json.keys?.p256dh,
				auth: json.keys?.auth
			})
		});
	} catch (cause) {
		console.error('Push subscribe failed', cause);
	}
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(normalized);
	const output = new Uint8Array(raw.length);

	for (let index = 0; index < raw.length; index += 1) {
		output[index] = raw.charCodeAt(index);
	}

	return output;
}
