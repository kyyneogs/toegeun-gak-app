<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import { scheduleRouteCopy } from '$lib/constants/kakao';
	import {
		LOGIN_TITLE,
		ROUTE_PAGE_TITLE,
		STAND_UP_BOARD_LABEL,
		STAND_UP_WALK_LABEL,
		STANDUP_ROUTE_MISSING,
		STANDUP_SCHEDULED_LOGIN,
		resultArrivalCopy
	} from '$lib/constants/recommendation';
	import type { StandupJobSummary } from '$lib/stores/session.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { standUpStartsWithWalk } from '$lib/utils/route-label';
	import { formatClock, fromIso } from '$lib/utils/time';

	const jobId = $derived(page.params.jobId ?? '');
	let job = $state<StandupJobSummary | null>(null);
	let loaded = $state(false);

	$effect(() => {
		if (!sessionStore.loaded) {
			return;
		}

		const id = jobId;
		const userId = sessionStore.user?.id ?? '';
		void loadJob(id, userId);
	});

	async function loadJob(id: string, userId: string): Promise<void> {
		loaded = false;
		job = null;

		if (!userId) {
			loaded = true;
			return;
		}

		if (!id) {
			await goto(resolve('/notifications'));
			return;
		}

		const fromList = sessionStore.standupJobs.find((item) => item.id === id);

		if (fromList) {
			job = fromList;
			loaded = true;
			return;
		}

		try {
			const response = await fetch(`/api/standup/${encodeURIComponent(id)}`);

			if (!response.ok) {
				await goto(resolve('/notifications'));
				return;
			}

			const payload = (await response.json()) as { job?: StandupJobSummary };
			job = payload.job ?? null;
			loaded = true;

			if (!job) {
				await goto(resolve('/notifications'));
			}
		} catch (cause) {
			console.error('Standup job load failed', cause);
			await goto(resolve('/notifications'));
		}
	}

	const route = $derived(job?.route ?? null);
	const standUpLabel = $derived(
		route && standUpStartsWithWalk(route.sections) ? STAND_UP_WALK_LABEL : STAND_UP_BOARD_LABEL
	);
</script>

<header class="nav-row">
	<BackLink fallback="/notifications" />
	<h1 class="nav-title">{ROUTE_PAGE_TITLE}</h1>
	<span></span>
</header>

{#if loaded && job && route}
	<p class="large-title">{formatClock(fromIso(route.departureAt))}</p>
	<p class="status-copy">{route.originName} → {route.destinationName}</p>
	<p class="status-copy">{standUpLabel}</p>
	<p class="status-copy">
		{resultArrivalCopy(route.lineLabel, formatClock(fromIso(route.arrivalAt)))}
	</p>
	<p class="status-copy">{scheduleRouteCopy(route.scheduleSource)}</p>
	<div class="card body">
		<RouteTimeline sections={route.sections} totalTimeSeconds={route.totalTimeSeconds} />
	</div>
{:else if loaded && job}
	<p class="status-copy">{job.body}</p>
	<p class="status-copy">{STANDUP_ROUTE_MISSING}</p>
{:else if loaded && !sessionStore.user}
	<p class="status-copy">{STANDUP_SCHEDULED_LOGIN}</p>
	<a class="nav-link" href={resolve('/login')}>{LOGIN_TITLE}</a>
{/if}

<style>
	.body {
		padding: 16px;
		margin-top: 16px;
	}
</style>
