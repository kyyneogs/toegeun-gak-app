self.addEventListener('push', (event) => {
	const payload = event.data
		? event.data.json()
		: { title: '퇴근각', body: '일어나면 돼요' };

	event.waitUntil(
		self.registration.showNotification(payload.title ?? '퇴근각', {
			body: payload.body ?? '',
			tag: 'standup'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			const existing = clients.find((client) => 'focus' in client);

			if (existing) {
				return existing.focus();
			}

			return self.clients.openWindow('/result');
		})
	);
});
