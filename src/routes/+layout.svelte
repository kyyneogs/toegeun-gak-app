<script lang="ts">
	import '$lib/styles/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LaunchSplash from '$lib/components/LaunchSplash.svelte';
	import WelcomeOnboarding from '$lib/components/WelcomeOnboarding.svelte';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { isBackNavigation, prefersReducedMotion } from '$lib/constants/motion';
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
		if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') {
			return;
		}

		const fromPath = navigation.from?.url.pathname ?? '/';
		const toPath = navigation.to?.url.pathname ?? '/';
		document.documentElement.dataset.nav = isBackNavigation(fromPath, toPath, navigation.type)
			? 'back'
			: 'forward';

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>퇴근각</title>
	<meta name="theme-color" content="#f2f2f7" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="퇴근각" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	{@render children()}
</div>
<WelcomeOnboarding />
<LaunchSplash />
