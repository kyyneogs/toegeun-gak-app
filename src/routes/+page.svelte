<script lang="ts">
	import PlaceSearchField from '$lib/components/PlaceSearchField.svelte';
	import PlaceConnectionStatus from '$lib/components/PlaceConnectionStatus.svelte';
	import RouteConnectionStatus from '$lib/components/RouteConnectionStatus.svelte';
	import { resolve } from '$app/paths';
	import {
		HOME_ARRIVE_BY_HELPER,
		HOME_ARRIVE_BY_LABEL,
		HOME_CTA_LABEL,
		HOME_TIME_HELPER,
		homeOriginCopy,
		STANDUP_PAGE_TITLE
	} from '$lib/constants/recommendation';
	import { HOME_STAGGER_MS } from '$lib/constants/motion';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { splashSession } from '$lib/stores/splash.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { Place } from '$lib/domain/place/place';

	let hydrated = $state(false);
	const skipEnterStagger = splashSession.finished;

	$effect(() => {
		if (settingsStore.loaded && !hydrated) {
			tripSession.hydrateFromSettings();
			void tripSession.restoreLastDestination();
			hydrated = true;
		}
	});

	const canSubmit = $derived(
		Boolean(tripSession.destination) && tripSession.status !== 'calculating'
	);

	function selectDestination(place: Place): void {
		void tripSession.selectDestination(place);
	}
</script>

<div
	class="home-stage"
	class:home-enter={splashSession.finished}
	class:home-stagger={splashSession.finished && !skipEnterStagger}
	style="--stagger-step: {HOME_STAGGER_MS}ms"
>
	<header class="nav-row">
		<h1 class="nav-title">퇴근각</h1>
		<div class="nav-end">
			<a class="nav-link" href={resolve('/notifications')}>{STANDUP_PAGE_TITLE}</a>
			<a class="nav-link" href={resolve('/settings')}>설정</a>
		</div>
	</header>

	<p class="large-title">오늘 어디로 가시나요?</p>

	<section class="field-block">
		<p class="section-label">목적지</p>
		<PlaceSearchField
			selected={tripSession.destination}
			placeholder="강남역, 판교역, 우리집"
			onSelect={selectDestination}
		/>
		{#if tripSession.destination}
			<p class="helper">{tripSession.destination.address}</p>
		{/if}
	</section>

	<section class="field-block">
		<p class="section-label">언제부터 퇴근할 수 있나요?</p>
		<div class="time-row card">
			<input class="time-input" type="time" bind:value={tripSession.departureFromClock} />
			<span class="muted">이후</span>
		</div>
		<p class="helper">{HOME_TIME_HELPER}</p>
	</section>

	<section class="field-block">
		<label class="arrive-toggle">
			<input type="checkbox" bind:checked={tripSession.arriveByEnabled} />
			<span>{HOME_ARRIVE_BY_LABEL}</span>
		</label>
		{#if tripSession.arriveByEnabled}
			<div class="time-row card">
				<input class="time-input" type="time" bind:value={tripSession.arriveByClock} />
				<span class="muted">까지</span>
			</div>
			<p class="helper">{HOME_ARRIVE_BY_HELPER}</p>
		{/if}
	</section>

	<p class="status-copy">{homeOriginCopy(settingsStore.origin.name)}</p>
	<a class="connection" href={resolve('/settings')}>
		<PlaceConnectionStatus compact />
		<RouteConnectionStatus compact />
	</a>

	<div class="spacer"></div>

	<button
		class="primary-button"
		type="button"
		disabled={!canSubmit}
		onclick={() => tripSession.calculate()}
	>
		{HOME_CTA_LABEL}
	</button>
</div>

<style>
	.home-stage {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: visible;
	}

	.home-enter > :global(.field-block:has(.search.open)) {
		z-index: 12;
	}

	.home-stage:not(.home-enter) {
		opacity: 0;
	}

	.home-stagger > :global(*) {
		animation: rise-in var(--duration-enter) var(--ease-out) both;
	}

	.home-stagger > :global(*:nth-child(1)) {
		animation-delay: 0ms;
	}

	.home-stagger > :global(*:nth-child(2)) {
		animation-delay: calc(1 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(3)) {
		animation-delay: calc(2 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(4)) {
		animation-delay: calc(3 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(5)) {
		animation-delay: calc(4 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(6)) {
		animation-delay: calc(5 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(7)) {
		animation-delay: calc(6 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(8)) {
		animation-delay: calc(7 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(9)) {
		animation-delay: calc(8 * var(--stagger-step));
	}

	.home-stagger > :global(*:nth-child(10)) {
		animation-delay: calc(9 * var(--stagger-step));
	}

	.time-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
	}

	.arrive-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-size: 15px;
	}

	.arrive-toggle input {
		width: 18px;
		height: 18px;
	}

	.helper {
		margin: 8px 0 0;
		color: var(--color-secondary-label);
		font-size: 13px;
		line-height: 1.4;
	}

	.connection {
		display: grid;
		gap: 8px;
		margin-top: 8px;
		color: inherit;
		text-decoration: none;
	}

	.nav-end {
		display: flex;
		align-items: center;
		gap: 16px;
	}
</style>
