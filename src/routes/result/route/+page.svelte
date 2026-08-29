<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import { KAKAO_LIVE_ROUTE_COPY, scheduleRouteCopy } from '$lib/constants/kakao';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { formatClock, fromIso } from '$lib/utils/time';

	const liveRoute = $derived(tripSession.result?.liveRoute ?? null);
	const predictedRoute = $derived(tripSession.result?.recommended.route ?? null);
	const showingLive = $derived(tripSession.routeDetailKind === 'live' && Boolean(liveRoute));
	const route = $derived(showingLive ? liveRoute : predictedRoute);

	$effect(() => {
		if (!route) {
			void goto(tripSession.result ? resolve('/result') : resolve('/'));
		}
	});
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/result')}>← 결과</a>
	<h1 class="nav-title">경로 상세</h1>
	<span></span>
</header>

{#if route && tripSession.result}
	{#if showingLive}
		<p class="large-title">실시간 경로</p>
		<p class="status-copy">{KAKAO_LIVE_ROUTE_COPY}</p>
	{:else}
		<p class="large-title">
			{formatClock(fromIso(tripSession.result.recommended.departureAt))} 출발
		</p>
		<p class="status-copy">{scheduleRouteCopy(tripSession.result.scheduleSource)}</p>
	{/if}
	<div class="card body">
		<RouteTimeline sections={route.sections} totalTimeSeconds={route.totalTimeSeconds} />
	</div>
{/if}

<style>
	.body {
		padding: 16px;
		margin-top: 16px;
	}
</style>
