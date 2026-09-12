<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import PlaceSearchField from '$lib/components/PlaceSearchField.svelte';
	import SuccessCheck from '$lib/components/SuccessCheck.svelte';
	import { PAGE_TRANSITION_MS, prefersReducedMotion } from '$lib/constants/motion';
	import {
		HOME_TIME_HELPER,
		WELCOME_DONE_LABEL,
		WELCOME_HOME_HELPER,
		WELCOME_HOME_PLACEHOLDER,
		WELCOME_HOME_TITLE,
		WELCOME_INTRO,
		WELCOME_LOGIN_HINT,
		WELCOME_NEXT_LABEL,
		WELCOME_ORIGIN_HELPER,
		WELCOME_ORIGIN_PLACEHOLDER,
		WELCOME_ORIGIN_TITLE,
		WELCOME_READY_HELPER,
		WELCOME_READY_TITLE,
		WELCOME_SKIP_LABEL,
		WELCOME_STEP_COPY,
		WELCOME_TIME_TITLE
	} from '$lib/constants/recommendation';
	import {
		onboardingReadyTimings,
		shouldKeepOnboardingOverlay
	} from '$lib/domain/onboarding/ready-timings';
	import { isAuthPath, shouldShowOnboarding } from '$lib/domain/onboarding/should-show';
	import type { Place } from '$lib/domain/place/place';
	import { ONBOARDING_LAST_STEP, onboardingSession } from '$lib/stores/onboarding.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { splashSession } from '$lib/stores/splash.svelte';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { isClockTime } from '$lib/utils/time';

	if (typeof window !== 'undefined') {
		onboardingSession.hydrate();
	}

	let ceremony = $state<'off' | 'ready' | 'leaving'>('off');
	let leavingFrom = $state<'form' | 'ready'>('form');
	let fadeTimer = 0;
	let doneTimer = 0;

	const showForm = $derived(
		shouldShowOnboarding({
			splashFinished: splashSession.finished,
			settingsLoaded: settingsStore.loaded,
			sessionLoaded: sessionStore.loaded,
			onboardingHydrated: onboardingSession.hydrated,
			loggedIn: Boolean(sessionStore.user),
			alreadyCompleted: onboardingSession.completed,
			onAuthPage: isAuthPath(page.url.pathname)
		})
	);

	const visible = $derived(shouldKeepOnboardingOverlay(showForm, ceremony));
	const showReady = $derived(
		ceremony === 'ready' || (ceremony === 'leaving' && leavingFrom === 'ready')
	);

	const canContinue = $derived.by(() => {
		if (onboardingSession.step === 1) {
			return Boolean(onboardingSession.origin);
		}

		if (onboardingSession.step === 2) {
			return Boolean(onboardingSession.home);
		}

		return isClockTime(onboardingSession.departureFromClock);
	});

	function clearCeremonyTimers(): void {
		if (typeof window === 'undefined') {
			return;
		}

		window.clearTimeout(fadeTimer);
		window.clearTimeout(doneTimer);
	}

	function closeOverlay(): void {
		ceremony = 'off';
		leavingFrom = 'form';
	}

	function dismissWithFade(from: 'form' | 'ready', afterFade: () => void): void {
		leavingFrom = from;
		ceremony = 'leaving';

		if (prefersReducedMotion()) {
			afterFade();
			closeOverlay();
			return;
		}

		doneTimer = window.setTimeout(() => {
			afterFade();
			closeOverlay();
		}, PAGE_TRANSITION_MS);
	}

	function playReadyThenClose(): void {
		const timings = onboardingReadyTimings(prefersReducedMotion());
		leavingFrom = 'ready';
		ceremony = 'ready';

		fadeTimer = window.setTimeout(() => {
			ceremony = 'leaving';
		}, timings.fadeAt);

		doneTimer = window.setTimeout(() => {
			closeOverlay();
		}, timings.doneAt);
	}

	function skip(): void {
		clearCeremonyTimers();
		dismissWithFade('form', () => {
			onboardingSession.markCompleted();
			onboardingSession.resetDraft();
		});
	}

	async function persistSetup(): Promise<void> {
		if (onboardingSession.origin) {
			await settingsStore.saveOrigin(onboardingSession.origin);
		}

		if (onboardingSession.home) {
			await settingsStore.saveHome(onboardingSession.home);
			await tripSession.selectDestination(onboardingSession.home);
		}

		await settingsStore.saveDefaultDepartureFrom(onboardingSession.departureFromClock);
		tripSession.hydrateFromSettings();
		onboardingSession.markCompleted();
		onboardingSession.resetDraft();
	}

	async function finish(): Promise<void> {
		clearCeremonyTimers();
		await persistSetup();

		if (prefersReducedMotion()) {
			closeOverlay();
			return;
		}

		playReadyThenClose();
	}

	async function continueStep(): Promise<void> {
		if (onboardingSession.step === 1 && !onboardingSession.origin) {
			return;
		}

		if (onboardingSession.step === 2 && !onboardingSession.home) {
			return;
		}

		if (
			onboardingSession.step === ONBOARDING_LAST_STEP &&
			!isClockTime(onboardingSession.departureFromClock)
		) {
			return;
		}

		if (onboardingSession.step < ONBOARDING_LAST_STEP) {
			onboardingSession.goNext();
			return;
		}

		await finish();
	}

	function selectOrigin(place: Place): void {
		onboardingSession.origin = place;
	}

	function selectHome(place: Place): void {
		onboardingSession.home = place;
	}

	function goToLogin(event: MouseEvent): void {
		event.preventDefault();
		void goto(resolve('/login'));
	}

	onDestroy(() => {
		clearCeremonyTimers();
	});
</script>

{#if visible}
	<div
		class="welcome"
		class:leaving={ceremony === 'leaving'}
		class:centered={showReady}
		aria-modal="true"
		role="dialog"
		aria-labelledby="welcome-title"
	>
		{#if showReady}
			<SuccessCheck size={72} />
			<h1 id="welcome-title" class="large-title ready-title">{WELCOME_READY_TITLE}</h1>
			<p class="ready-helper">{WELCOME_READY_HELPER}</p>
		{:else}
			{#key onboardingSession.step}
				<div class="step-body">
					<p class="step">{WELCOME_STEP_COPY[onboardingSession.step - 1]}</p>
					{#if onboardingSession.step === 1}
						<p class="intro">{WELCOME_INTRO}</p>
						<h1 id="welcome-title" class="large-title">{WELCOME_ORIGIN_TITLE}</h1>
						<p class="helper">{WELCOME_ORIGIN_HELPER}</p>
						<div class="field-block search-block">
							<PlaceSearchField
								selected={onboardingSession.origin}
								placeholder={WELCOME_ORIGIN_PLACEHOLDER}
								onSelect={selectOrigin}
							/>
						</div>
					{:else if onboardingSession.step === 2}
						<h1 id="welcome-title" class="large-title">{WELCOME_HOME_TITLE}</h1>
						<p class="helper">{WELCOME_HOME_HELPER}</p>
						<div class="field-block search-block">
							<PlaceSearchField
								selected={onboardingSession.home}
								placeholder={WELCOME_HOME_PLACEHOLDER}
								onSelect={selectHome}
							/>
						</div>
					{:else}
						<h1 id="welcome-title" class="large-title">{WELCOME_TIME_TITLE}</h1>
						<p class="helper">{HOME_TIME_HELPER}</p>
						<div class="time-row card">
							<input
								class="time-input"
								type="time"
								bind:value={onboardingSession.departureFromClock}
							/>
							<span class="muted">이후</span>
						</div>
					{/if}
				</div>
			{/key}

			<div class="actions">
				<button
					class="primary-button"
					type="button"
					disabled={!canContinue}
					onclick={() => continueStep()}
				>
					{onboardingSession.step < ONBOARDING_LAST_STEP ? WELCOME_NEXT_LABEL : WELCOME_DONE_LABEL}
				</button>
				<button class="ghost-button" type="button" onclick={skip}>{WELCOME_SKIP_LABEL}</button>
				<a class="login-link" href={resolve('/login')} onclick={goToLogin}>{WELCOME_LOGIN_HINT}</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	.welcome {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		width: min(100%, var(--app-max-width));
		margin: 0 auto;
		padding: calc(12px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom));
		background: var(--color-bg);
		overflow: visible;
		animation: fade-in var(--duration-enter) var(--ease-out) both;
	}

	.welcome.centered {
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.leaving {
		animation: welcome-fade var(--duration-page) var(--ease-in) both;
	}

	.step {
		margin: 12px 0 8px;
		color: var(--color-label);
		font-size: 13px;
		font-weight: 500;
	}

	.step-body {
		position: relative;
		z-index: 2;
		animation: rise-in var(--duration-enter) var(--ease-out) both;
	}

	.intro {
		margin: 0 0 12px;
		color: var(--color-secondary-label);
		font-size: 17px;
		line-height: 1.4;
	}

	.welcome :global(.large-title) {
		margin-bottom: 8px;
	}

	.helper {
		margin: 0 0 20px;
		color: var(--color-secondary-label);
		font-size: 15px;
		line-height: 1.4;
	}

	.search-block {
		position: relative;
		z-index: 12;
		margin-bottom: 0;
	}

	.time-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
	}

	.actions {
		position: relative;
		z-index: 1;
		margin-top: auto;
		display: grid;
		gap: 8px;
		padding-top: 24px;
		animation: rise-in var(--duration-enter) var(--ease-out) 80ms both;
	}

	.welcome:has(:global(.search.open)) .actions {
		pointer-events: none;
	}

	.login-link {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		color: var(--color-secondary-label);
		font-size: 15px;
		text-decoration: none;
	}

	.ready-title {
		margin: 16px 0 0;
		text-align: center;
		animation: rise-in var(--duration-enter) var(--ease-out) var(--delay-check-mark) both;
	}

	.ready-helper {
		margin: 8px 0 0;
		color: var(--color-secondary-label);
		font-size: 17px;
		text-align: center;
		animation: rise-in var(--duration-enter) var(--ease-out) 140ms both;
	}

	@keyframes welcome-fade {
		to {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		@keyframes welcome-fade {
			from,
			to {
				opacity: 1;
			}
		}
	}
</style>
