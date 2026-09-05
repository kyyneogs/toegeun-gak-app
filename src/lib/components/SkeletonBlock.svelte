<script lang="ts">
	import { SKELETON_LINE_DELAY_MS } from '$lib/constants/motion';

	interface Props {
		lines?: number;
	}

	let { lines = 3 }: Props = $props();
</script>

<div class="stack" aria-hidden="true">
	<div class="hero pulse"></div>
	{#each Array.from({ length: lines }, (_value, index) => index) as index (index)}
		<div class="line pulse" style="--line-delay: {index * SKELETON_LINE_DELAY_MS}ms"></div>
	{/each}
</div>

<style>
	.stack {
		display: grid;
		gap: 12px;
		padding: 24px 0;
	}

	.hero {
		height: 84px;
		border-radius: 20px;
		background: var(--color-fill);
		animation:
			shimmer var(--duration-shimmer) ease-in-out infinite,
			hero-breathe var(--duration-breathe) ease-in-out infinite;
	}

	.line {
		height: 18px;
		border-radius: 8px;
		background: var(--color-fill);
		animation: shimmer var(--duration-shimmer) ease-in-out infinite;
		animation-delay: var(--line-delay, 0ms);
	}

	.line:nth-child(3) {
		width: 72%;
	}

	@keyframes shimmer {
		0% {
			opacity: 1;
			background-position: 100% 0;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 1;
			background-position: -100% 0;
		}
	}

	.pulse {
		background-image: linear-gradient(
			90deg,
			var(--color-fill) 0%,
			var(--color-fill-strong) 50%,
			var(--color-fill) 100%
		);
		background-size: 200% 100%;
	}

	@keyframes hero-breathe {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero,
		.line {
			animation: none;
		}
	}
</style>
