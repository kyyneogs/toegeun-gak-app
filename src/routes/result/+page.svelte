<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SkeletonBlock from '$lib/components/SkeletonBlock.svelte';
	import LoadingStatus from '$lib/components/LoadingStatus.svelte';
	import WaitComparison from '$lib/components/WaitComparison.svelte';
	import { scheduleRouteCopy } from '$lib/constants/kakao';
	import {
		ARRIVE_BY_RESULT_HELPER,
		COMMIT_CTA_LABEL,
		COMMIT_DONE_LABEL,
		COMMIT_NEED_ACCOUNT,
		PUSH_IOS_HINT,
		CRITERION_SECTION_LABEL,
		AI_PICK_LOADING_COPY,
		OVERTIME_SECTION_LABEL,
		OVERTIME_TEN_LABEL,
		OVERTIME_THIRTY_LABEL,
		RESULT_ERROR_TITLE,
		RESULT_NAV_TITLE,
		RESULT_RETRY_CTA,
		RESULT_ROUTE_CTA,
		RESULT_TOTAL_LABEL,
		RESULT_WAIT_LABEL,
		RESULT_WALK_LABEL,
		STAND_UP_BOARD_LABEL,
		STAND_UP_WALK_LABEL,
		criterionLabel,
		resultArrivalCopy,
		resultSavedCopy
	} from '$lib/constants/recommendation';
	import { savedArrivalSeconds } from '$lib/domain/commit/saved-time';
	import {
		RESULT_CHIP_CRITERIA,
		type ResultChipCriterion
	} from '$lib/domain/recommendation/criteria';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { standUpStartsWithWalk, transitLineLabel } from '$lib/utils/route-label';
	import { formatClock, formatDurationMinutes, fromIso } from '$lib/utils/time';

	const recommended = $derived(tripSession.displayedRecommended());
	const committed = $derived(sessionStore.hasCommitFor(tripSession.result?.id ?? null));
	const savedSeconds = $derived(
		recommended && tripSession.result
			? savedArrivalSeconds(recommended.expectedArrivalAt, tripSession.result.naiveArrivalAt)
			: 0
	);
	const savedCopy = $derived(resultSavedCopy(savedSeconds));

	$effect(() => {
		if (tripSession.status === 'idle') {
			void goto(resolve('/'));
		}
	});

	function chooseCriterion(criterion: ResultChipCriterion): void {
		if (criterion === 'aiPick') {
			void tripSession.selectAiCriterion();
			return;
		}

		tripSession.selectCriterion(criterion);
	}

	function commitRoute(): void {
		void sessionStore.commitCurrentRecommendation();
	}
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/')} onclick={() => tripSession.resetResult()}>← 홈</a>
	<h1 class="nav-title">{RESULT_NAV_TITLE}</h1>
	<span></span>
</header>

{#if tripSession.status === 'calculating'}
	<LoadingStatus message={tripSession.loadingCopy()} />
	<SkeletonBlock lines={4} />
{:else if tripSession.status === 'error'}
	<div class="error-block">
		<p class="large-title error-title">{RESULT_ERROR_TITLE}</p>
		<p class="status-copy">{tripSession.errorMessage}</p>
		<button class="primary-button" type="button" onclick={() => goto(resolve('/'))}
			>{RESULT_RETRY_CTA}</button
		>
	</div>
{:else if recommended && tripSession.result && tripSession.trip}
	{@const recommendedLine = transitLineLabel(recommended.route.sections)}
	{@const standUpWalk = standUpStartsWithWalk(recommended.route.sections)}
	{@const standUpLabel = standUpWalk ? STAND_UP_WALK_LABEL : STAND_UP_BOARD_LABEL}
	{@const arrivalClock = formatClock(fromIso(recommended.expectedArrivalAt))}

	<section class="predicted">
		<p class="hero-time">{formatClock(fromIso(recommended.departureAt))}</p>
		<p class="hero-label">{standUpLabel}</p>
		<p class="hero-arrival">{resultArrivalCopy(recommendedLine, arrivalClock)}</p>
		{#if savedCopy}
			<p class="helper predicted-copy">{savedCopy}</p>
		{/if}
		<p class="helper predicted-copy">{scheduleRouteCopy(tripSession.result.scheduleSource)}</p>
		{#if tripSession.selectedCriterion === 'aiPick' && tripSession.aiStatus === 'loading'}
			<p class="helper predicted-copy">{AI_PICK_LOADING_COPY}</p>
		{/if}
		{#if tripSession.selectedCriterion === 'aiPick' && tripSession.aiStatus === 'ready' && tripSession.aiReason}
			<p class="helper predicted-copy">{tripSession.aiReason}</p>
		{/if}
		{#if tripSession.selectedCriterion === 'aiPick' && tripSession.aiStatus === 'error' && tripSession.aiErrorMessage}
			<p class="helper predicted-copy">{tripSession.aiErrorMessage}</p>
		{/if}
		{#if tripSession.result.mode === 'arriveBy' && tripSession.selectedCriterion === 'latestDeparture'}
			<p class="helper predicted-copy">{ARRIVE_BY_RESULT_HELPER}</p>
		{/if}

		{#if recommended.headwayLoss}
			<WaitComparison loss={recommended.headwayLoss} />
		{/if}

		<section class="card stats">
			<p class="route-line">{tripSession.trip.origin.name} → {tripSession.trip.destination.name}</p>
			<div class="stat-row">
				<span>{RESULT_WALK_LABEL}</span>
				<strong>{formatDurationMinutes(recommended.walkingTimeSeconds)}</strong>
			</div>
			{#if recommended.waitingTimeSeconds > 0}
				<div class="stat-row">
					<span>{RESULT_WAIT_LABEL}</span>
					<strong>{formatDurationMinutes(recommended.waitingTimeSeconds)}</strong>
				</div>
			{/if}
			<div class="stat-row">
				<span>{RESULT_TOTAL_LABEL}</span>
				<strong>{formatDurationMinutes(recommended.totalTimeSeconds)}</strong>
			</div>
		</section>

		<section class="criteria">
			<p class="section-label">{CRITERION_SECTION_LABEL}</p>
			<div class="chip-row">
				{#each RESULT_CHIP_CRITERIA as criterion (criterion)}
					<button
						class="chip"
						class:active={tripSession.selectedCriterion === criterion}
						type="button"
						disabled={criterion === 'aiPick' && tripSession.aiStatus === 'loading'}
						onclick={() => chooseCriterion(criterion)}
					>
						{criterionLabel(criterion)}
					</button>
				{/each}
			</div>
		</section>

		<section class="overtime">
			<p class="section-label">{OVERTIME_SECTION_LABEL}</p>
			<div class="chip-row">
				<button class="chip" type="button" onclick={() => tripSession.delayDeparture(10)}
					>{OVERTIME_TEN_LABEL}</button
				>
				<button class="chip" type="button" onclick={() => tripSession.delayDeparture(30)}
					>{OVERTIME_THIRTY_LABEL}</button
				>
			</div>
		</section>

		<a class="primary-button link-button" href={resolve('/result/route')}>{RESULT_ROUTE_CTA}</a>
		{#if committed}
			<p class="helper predicted-copy">{COMMIT_DONE_LABEL}</p>
			<p class="helper predicted-copy">{PUSH_IOS_HINT}</p>
		{:else if !sessionStore.user}
			<p class="helper predicted-copy">{COMMIT_NEED_ACCOUNT}</p>
			<a class="ghost-button" href={resolve('/login')}>{COMMIT_CTA_LABEL}</a>
		{:else}
			<button class="ghost-button" type="button" onclick={commitRoute}>{COMMIT_CTA_LABEL}</button>
		{/if}
		{#if sessionStore.errorMessage}
			<p class="helper predicted-copy">{sessionStore.errorMessage}</p>
		{/if}
	</section>
{/if}

<style>
	.helper {
		margin: 0 0 12px;
		color: var(--color-secondary-label);
		font-size: 13px;
		line-height: 1.4;
	}

	.hero-label {
		margin: 10px 0 8px;
		color: var(--color-text);
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		text-align: center;
		animation: rise-in var(--duration-enter) var(--ease-out) 80ms both;
	}

	.hero-time {
		margin: 24px 0 0;
		font-size: var(--hero-size);
		font-weight: 700;
		letter-spacing: -0.06em;
		line-height: 1;
		text-align: center;
		font-variant-numeric: tabular-nums;
		animation: hero-pop var(--duration-hero-pop) var(--ease-spring) both;
	}

	.hero-arrival {
		margin: 4px 0 8px;
		color: var(--color-secondary-label);
		font-size: 17px;
		font-weight: 600;
		text-align: center;
		font-variant-numeric: tabular-nums;
		animation: rise-in var(--duration-enter) var(--ease-out) 120ms both;
	}

	.error-block {
		animation: fade-in var(--duration-enter) var(--ease-out) both;
	}

	.predicted-copy {
		text-align: center;
	}

	.stats {
		padding: 16px;
		margin-bottom: 8px;
	}

	.route-line {
		margin: 0 0 12px;
		font-weight: 600;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 8px 0;
		color: var(--color-secondary-label);
	}

	.stat-row strong {
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}

	.error-title {
		font-size: 28px;
	}

	.link-button {
		margin-top: 8px;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.criteria,
	.overtime {
		margin: 16px 0;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		min-height: 36px;
		padding: 0 12px;
		border: 0.5px solid var(--color-separator);
		border-radius: var(--radius-pill);
		background: var(--color-card);
		color: var(--color-text);
		font-size: 14px;
	}

	.chip.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.chip:disabled {
		opacity: 0.6;
	}
</style>
