<script lang="ts">
	import PlaceSearchField from '$lib/components/PlaceSearchField.svelte';
	import PlaceConnectionStatus from '$lib/components/PlaceConnectionStatus.svelte';
	import RouteConnectionStatus from '$lib/components/RouteConnectionStatus.svelte';
	import { resolve } from '$app/paths';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { Place } from '$lib/domain/place/place';

	function saveOrigin(place: Place): void {
		void settingsStore.saveOrigin(place);
	}

	function saveHome(place: Place): void {
		void settingsStore.saveHome(place);
	}
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/')}>← 홈</a>
	<h1 class="nav-title">설정</h1>
	<span></span>
</header>

<p class="large-title">기본 정보</p>

<section class="field-block">
	<p class="section-label">연결</p>
	<div class="connection-stack">
		<PlaceConnectionStatus />
		<RouteConnectionStatus />
	</div>
</section>

<section class="field-block">
	<p class="section-label">출발지</p>
	<PlaceSearchField
		selected={settingsStore.origin}
		placeholder="회사, 판교역"
		onSelect={saveOrigin}
	/>
	<p class="helper">{settingsStore.origin.address}</p>
</section>

<section class="field-block">
	<p class="section-label">기본 퇴근 가능시간</p>
	<div class="card time-wrap">
		<input
			class="time-input"
			type="time"
			bind:value={settingsStore.defaultDepartureFrom}
			onchange={() => settingsStore.saveDefaultDepartureFrom(settingsStore.defaultDepartureFrom)}
		/>
	</div>
</section>

<section class="field-block">
	<p class="section-label">집</p>
	<PlaceSearchField
		selected={settingsStore.home}
		placeholder="우리집, 집 근처 역"
		onSelect={saveHome}
	/>
	{#if settingsStore.home}
		<p class="helper">{settingsStore.home.address}</p>
	{/if}
</section>

<style>
	.connection-stack {
		display: grid;
		gap: 12px;
	}

	.time-wrap {
		display: flex;
		padding: 6px 12px;
	}
</style>
