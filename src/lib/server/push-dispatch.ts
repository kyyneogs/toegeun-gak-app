import webpush, { WebPushError } from 'web-push';
import { PUSH_DISPATCH_INTERVAL_MS } from '$lib/constants/persist';
import {
	deletePushSubscription,
	dueStandupJobs,
	markStandupSent,
	pushSubscriptionsForUser
} from '$lib/server/push-store';
import { getVapidKeys } from '$lib/server/vapid';

let dispatchTimer: ReturnType<typeof setInterval> | null = null;

export function startPushDispatcher(): void {
	if (dispatchTimer || typeof setInterval === 'undefined') {
		return;
	}

	dispatchTimer = setInterval(() => {
		void dispatchDueStandups();
	}, PUSH_DISPATCH_INTERVAL_MS);
}

export async function dispatchDueStandups(now = new Date()): Promise<void> {
	const keys = getVapidKeys();

	if (!keys) {
		return;
	}

	webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
	const jobs = await dueStandupJobs(now);

	for (const job of jobs) {
		const subscriptions = await pushSubscriptionsForUser(job.userId);
		const payload = JSON.stringify({ title: job.title, body: job.body });

		for (const subscription of subscriptions) {
			try {
				await webpush.sendNotification(
					{
						endpoint: subscription.endpoint,
						keys: { p256dh: subscription.p256dh, auth: subscription.auth }
					},
					payload
				);
			} catch (cause) {
				if (
					cause instanceof WebPushError &&
					(cause.statusCode === 404 || cause.statusCode === 410)
				) {
					await deletePushSubscription(job.userId, subscription.endpoint);
					continue;
				}

				console.error('Web push send failed', cause);
			}
		}

		await markStandupSent(job.id, now);
	}
}
