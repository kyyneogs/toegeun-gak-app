import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import { formatClock, fromIso } from '$lib/utils/time';
import { settingsStore } from '$lib/stores/settings.svelte';
import { standupLeadMs } from '$lib/constants/persist';

export interface StandupReminder {
	at: string;
	title: string;
	body: string;
	leadMs?: number;
}

export async function registerStandupWorker(): Promise<ServiceWorkerRegistration | null> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return null;
	}

	try {
		return await navigator.serviceWorker.register('/sw.js');
	} catch (cause) {
		console.error('Service worker registration failed', cause);
		return null;
	}
}

export async function scheduleStandupReminder(reminder: StandupReminder): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(STORAGE_KEYS.STANDUP_REMINDER, JSON.stringify(reminder));
	await armReminder(reminder);
}

export async function restoreStandupReminder(): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	const raw = window.localStorage.getItem(STORAGE_KEYS.STANDUP_REMINDER);

	if (!raw) {
		return;
	}

	try {
		const reminder = JSON.parse(raw) as StandupReminder;
		await armReminder(reminder);
	} catch (cause) {
		console.error('Standup reminder restore failed', cause);
		window.localStorage.removeItem(STORAGE_KEYS.STANDUP_REMINDER);
	}
}

async function armReminder(reminder: StandupReminder): Promise<void> {
	const leadMs = reminder.leadMs ?? standupLeadMs(settingsStore.standupLeadMinutes);
	const fireAt = fromIso(reminder.at).getTime() - leadMs;
	const delay = fireAt - Date.now();

	if (delay <= 0) {
		window.localStorage.removeItem(STORAGE_KEYS.STANDUP_REMINDER);
		return;
	}

	if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
		await Notification.requestPermission();
	}

	window.setTimeout(() => {
		void showStandupNotification(reminder);
		window.localStorage.removeItem(STORAGE_KEYS.STANDUP_REMINDER);
	}, delay);
}

async function showStandupNotification(reminder: StandupReminder): Promise<void> {
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
		return;
	}

	const registration = await navigator.serviceWorker?.ready.catch(() => null);

	if (registration?.showNotification) {
		await registration.showNotification(reminder.title, {
			body: reminder.body,
			tag: 'standup'
		});
		return;
	}

	new Notification(reminder.title, { body: reminder.body });
}

export function standupReminderCopy(departureAt: string): StandupReminder {
	const clock = formatClock(fromIso(departureAt));
	return {
		at: departureAt,
		title: '퇴근각',
		body: `${clock}에 일어나면 돼요`,
		leadMs: standupLeadMs(settingsStore.standupLeadMinutes)
	};
}
