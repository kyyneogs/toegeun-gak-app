<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 88 }: Props = $props();
</script>

<svg
	class="check-anim"
	viewBox="0 0 100 100"
	width={size}
	height={size}
	aria-hidden="true"
	focusable="false"
>
	<circle class="check-circle" cx="50" cy="50" r="45" fill="none" stroke-width="6" />
	<path
		class="check-mark"
		d="M28 52 L44 68 L74 34"
		fill="none"
		stroke-width="6"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>

<style>
	.check-anim {
		display: block;
		margin: 0 auto;
		overflow: visible;
	}

	.check-circle,
	.check-mark {
		stroke: var(--color-accent);
	}

	.check-circle {
		stroke-dasharray: 283;
		stroke-dashoffset: 283;
		transform-origin: 50px 50px;
		animation:
			draw-circle var(--duration-check-circle) var(--ease-out) forwards,
			pop-in var(--duration-check-circle) var(--ease-bounce) forwards;
	}

	.check-mark {
		stroke-dasharray: 60;
		stroke-dashoffset: 60;
		animation: draw-check var(--duration-check-mark) var(--ease-out) var(--delay-check-mark)
			forwards;
	}

	@keyframes draw-circle {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes draw-check {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes pop-in {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		60% {
			transform: scale(1.08);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.check-circle,
		.check-mark {
			stroke-dashoffset: 0;
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
