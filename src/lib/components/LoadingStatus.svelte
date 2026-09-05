<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ELLIPSIS_INTERVAL_MS,
		ELLIPSIS_MAX_DOTS,
		prefersReducedMotion
	} from '$lib/constants/motion';
	import { RESULT_LOADING_COPY, RESULT_LOADING_STEM } from '$lib/constants/recommendation';

	let dotCount = $state(ELLIPSIS_MAX_DOTS);
	let reduced = $state(false);

	onMount(() => {
		if (prefersReducedMotion()) {
			reduced = true;
			return;
		}

		dotCount = 1;
		const interval = window.setInterval(() => {
			dotCount = dotCount >= ELLIPSIS_MAX_DOTS ? 1 : dotCount + 1;
		}, ELLIPSIS_INTERVAL_MS);

		return () => {
			window.clearInterval(interval);
		};
	});

	const dots = $derived('.'.repeat(dotCount));
</script>

<p class="status-copy loading">
	{#if reduced}
		{RESULT_LOADING_COPY}
	{:else}
		{RESULT_LOADING_STEM}요{dots}
	{/if}
</p>

<style>
	.loading {
		min-height: 1.4em;
	}
</style>
