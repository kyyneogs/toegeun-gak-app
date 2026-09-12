<script lang="ts">
	import '$lib/styles/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LaunchSplash from '$lib/components/LaunchSplash.svelte';
	import WelcomeOnboarding from '$lib/components/WelcomeOnboarding.svelte';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { navigationDirection, prefersReducedMotion } from '$lib/constants/motion';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import {
		registerStandupWorker,
		restoreStandupReminder
	} from '$lib/application/notify/standup-reminder';

	let { children } = $props();

	onMount(() => {
		void settingsStore.load();
		void sessionStore.load();
		void registerStandupWorker().then(() => restoreStandupReminder());
	});

	onNavigate((navigation) => {
		const fromPath = navigation.from?.url.pathname ?? '/';
		const toPath = navigation.to?.url.pathname ?? '/';
		document.documentElement.dataset.nav = navigationDirection(fromPath, toPath, navigation.type);

		if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') {
			return;
		}

		document.documentElement.setAttribute('data-page-transition', '');

		return new Promise<void>((resolve) => {
			try {
				const transition = document.startViewTransition(async () => {
					resolve();
					await navigation.complete;
				});
				void transition.finished.finally(() => {
					document.documentElement.removeAttribute('data-page-transition');
				});
			} catch (error) {
				document.documentElement.removeAttribute('data-page-transition');
				console.error('page transition failed', error);
				resolve();
			}
		});
	});
</script>

<svelte:head>
	<title>퇴근각</title>
	<meta name="theme-color" content="#f2f4f6" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="퇴근각" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	{@render children()}
</div>
<WelcomeOnboarding />
<LaunchSplash />
