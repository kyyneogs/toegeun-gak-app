<script lang="ts">
	import { onMount } from 'svelte';
	import { COUNT_UP_MS, countToward } from '$lib/constants/motion';
	import { HEADWAY_LOSS_TITLE } from '$lib/constants/recommendation';
	import {
		formatHeadwayLossFigure,
		headwayLossDisplay
	} from '$lib/domain/optimization/headway-loss';
	import type { HeadwayLoss } from '$lib/domain/route/route';

	interface Props {
		loss: HeadwayLoss;
	}

	let { loss }: Props = $props();
	const display = $derived(headwayLossDisplay(loss));
	let shownValue = $state(0);

	onMount(() => {
		shownValue = 0;
		const startedAt = performance.now();
		let frame = 0;

		const tick = (now: number) => {
			shownValue = countToward(display.targetValue, now - startedAt, COUNT_UP_MS);

			if (shownValue < display.targetValue) {
				frame = requestAnimationFrame(tick);
			}
		};

		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
		};
	});
</script>

<section class="card comparison">
	<h2 class="title">{HEADWAY_LOSS_TITLE}</h2>
	<p class="figure" class:danger={display.tone === 'danger'}>
		{formatHeadwayLossFigure(loss, shownValue)}
	</p>
	<p class="copy">{display.support}</p>
</section>

<style>
	.comparison {
		padding: 16px;
		margin-bottom: 8px;
		animation: rise-in var(--duration-enter) var(--ease-out) both;
	}

	.title {
		margin: 0 0 6px;
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.figure {
		margin: 4px 0 6px;
		font-size: 40px;
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}

	.figure.danger {
		color: var(--color-danger);
	}

	.copy {
		margin: 0;
		color: var(--color-secondary-label);
		font-size: 15px;
		line-height: 1.45;
	}
</style>
