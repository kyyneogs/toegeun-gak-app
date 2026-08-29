<script lang="ts">
	interface Props {
		lines?: number;
	}

	let { lines = 3 }: Props = $props();
</script>

<div class="stack" aria-hidden="true">
	<div class="hero pulse"></div>
	{#each Array.from({ length: lines }, (_value, index) => index) as index (index)}
		<div class="line pulse"></div>
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
	}

	.line {
		height: 18px;
		border-radius: 8px;
		background: var(--color-fill);
	}

	.line:nth-child(3) {
		width: 72%;
	}

	.pulse {
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse {
			animation: none;
		}
	}
</style>
