<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import { scheduleRouteCopy } from '$lib/constants/kakao';
	import {
		ROUTE_PAGE_TITLE,
		STAND_UP_BOARD_LABEL,
		STAND_UP_WALK_LABEL,
		resultArrivalCopy
	} from '$lib/constants/recommendation';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { standUpStartsWithWalk, transitLineLabel } from '$lib/utils/route-label';
	import { formatClock, fromIso } from '$lib/utils/time';

	const displayed = $derived(tripSession.displayedRecommended());
	const route = $derived(displayed?.route ?? null);
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
	<BackLink fallback="/result" />
	<h1 class="nav-title">{ROUTE_PAGE_TITLE}</h1>
	<span></span>
</header>

{#if displayed && route && tripSession.result && tripSession.trip}
	<p class="large-title">
		{formatClock(fromIso(displayed.departureAt))}
	</p>
	<p class="status-copy">{tripSession.trip.origin.name} → {tripSession.trip.destination.name}</p>
	<p class="status-copy">{standUpLabel}</p>
	<p class="status-copy">
		{resultArrivalCopy(
			transitLineLabel(route.sections),
			formatClock(fromIso(displayed.expectedArrivalAt))
		)}
	</p>
	<p class="status-copy">{scheduleRouteCopy(tripSession.result.scheduleSource)}</p>
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
