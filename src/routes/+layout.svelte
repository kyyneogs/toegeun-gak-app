<script lang="ts">
	import '$lib/styles/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	let { children } = $props();

	onMount(() => {
		void settingsStore.load();
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
