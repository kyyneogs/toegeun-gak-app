<script lang="ts">
	import { SKELETON_LINE_DELAY_MS } from '$lib/constants/motion';

	interface Props {
		lines?: number;
	}

	let { lines = 3 }: Props = $props();
</script>

<div class="stack" aria-hidden="true">
	{#each Array.from({ length: lines }, (_value, index) => index) as index (index)}
		<div class="line pulse" style="--line-delay: {index * SKELETON_LINE_DELAY_MS}ms"></div>
	{/each}
	<div class="block pulse" style="--line-delay: {lines * SKELETON_LINE_DELAY_MS}ms"></div>
</div>

<style>
	.stack {
		display: grid;
		gap: 12px;
		padding: 12px 0 24px;
	}

	.line {
		height: 18px;
		border-radius: 8px;
		animation: shimmer var(--duration-shimmer) ease-in-out infinite;
		animation-delay: var(--line-delay, 0ms);
	}

	.line:nth-child(2) {
		width: 72%;
	}

	.line:nth-child(3) {
		width: 56%;
	}

	.block {
		height: min(36dvh, 280px);
		border-radius: var(--radius-card);
		animation: shimmer var(--duration-shimmer) ease-in-out infinite;
		animation-delay: var(--line-delay, 0ms);
	}

	@keyframes shimmer {
		0% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0 50%;
		}
	}

	.pulse {
		background-image: linear-gradient(
			90deg,
			var(--color-fill) 0%,
			var(--color-card) 37%,
			var(--color-fill) 63%
		);
		background-size: 400% 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		.line,
		.block {
			animation: none;
		}
	}
</style>
