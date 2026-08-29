<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import { scheduleRouteCopy } from '$lib/constants/kakao';
	import { STAND_UP_BOARD_LABEL, STAND_UP_WALK_LABEL } from '$lib/constants/recommendation';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { standUpStartsWithWalk } from '$lib/utils/route-label';
	import { formatClock, fromIso } from '$lib/utils/time';

	const route = $derived(tripSession.result?.recommended.route ?? null);
	const standUpLabel = $derived(
		route && standUpStartsWithWalk(route.sections) ? STAND_UP_WALK_LABEL : STAND_UP_BOARD_LABEL
	);

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
	<p class="large-title">
		{formatClock(fromIso(tripSession.result.recommended.departureAt))}
	</p>
	<p class="status-copy">{standUpLabel}</p>
	<p class="status-copy">
		{formatClock(fromIso(tripSession.result.recommended.expectedArrivalAt))} 도착 · {scheduleRouteCopy(
			tripSession.result.scheduleSource
		)}
	</p>
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
