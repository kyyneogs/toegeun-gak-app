<script lang="ts">
	import PlaceSearchField from '$lib/components/PlaceSearchField.svelte';
	import PlaceConnectionStatus from '$lib/components/PlaceConnectionStatus.svelte';
	import RouteConnectionStatus from '$lib/components/RouteConnectionStatus.svelte';
	import { resolve } from '$app/paths';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { Place } from '$lib/domain/place/place';

	let hydrated = $state(false);

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

<header class="nav-row">
	<h1 class="nav-title">퇴근각</h1>
	<a class="nav-link" href={resolve('/settings')}>설정</a>
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
	<p class="helper">이 시각 이후 출발해 가장 빨리 도착하는 경로를 고릅니다.</p>
</section>

<p class="status-copy">출발지 {settingsStore.origin.name}</p>
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
	오늘의 퇴근각 보기
</button>

<style>
	.time-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
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
</style>
