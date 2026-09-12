<script lang="ts">
	import { onMount } from 'svelte';
	import { SPLASH_ENTER_MS, SPLASH_FADE_MS, SPLASH_HOLD_MS } from '$lib/constants/motion';
	import { greetingCopy, WELCOME_READY_MARK } from '$lib/constants/recommendation';
	import { splashSession } from '$lib/stores/splash.svelte';

	let leaving = $state(false);
	let visible = $state(false);
	const hello = greetingCopy();

	$effect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		const themeMeta = document.querySelector('meta[name="theme-color"]');

		if (!themeMeta) {
			return;
		}

		const rootStyles = getComputedStyle(document.documentElement);

		if (visible && !leaving) {
			themeMeta.setAttribute('content', rootStyles.getPropertyValue('--color-accent').trim());
			return;
		}

		themeMeta.setAttribute('content', rootStyles.getPropertyValue('--color-bg').trim());
	});

	onMount(() => {
		if (!splashSession.shouldPlay()) {
			splashSession.finish();
			return;
		}

		visible = true;
		const fadeAt = window.setTimeout(() => {
			leaving = true;
		}, SPLASH_ENTER_MS + SPLASH_HOLD_MS);
		const doneAt = window.setTimeout(
			() => {
				splashSession.finish(true);
				visible = false;
			},
			SPLASH_ENTER_MS + SPLASH_HOLD_MS + SPLASH_FADE_MS
		);

		return () => {
			window.clearTimeout(fadeAt);
			window.clearTimeout(doneAt);
		};
	});
</script>

{#if visible}
	<div class="splash" class:leaving aria-hidden="true">
		<p class="mark">{WELCOME_READY_MARK}</p>
		<p class="hello">{hello}</p>
	</div>
{/if}

<style>
	.splash {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.leaving {
		animation: splash-fade var(--duration-splash-fade) var(--ease-in) both;
	}

	.mark {
		margin: 0;
		font-size: 34px;
		font-weight: 700;
		letter-spacing: -0.04em;
		animation: splash-bounce var(--duration-splash) var(--ease-bounce) both;
	}

	.hello {
		margin: 0;
		color: var(--color-on-accent-muted);
		font-size: 17px;
		animation: greeting-in var(--duration-greeting) var(--ease-out) var(--delay-greeting) both;
	}

	@keyframes splash-bounce {
		0% {
			opacity: 0;
			transform: scale(0.84);
		}
		58% {
			opacity: 1;
			transform: scale(1.06);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes greeting-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes splash-fade {
		to {
			opacity: 0;
		}
	}
</style>
