<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SkeletonBlock from '$lib/components/SkeletonBlock.svelte';
	import WaitComparison from '$lib/components/WaitComparison.svelte';
	import { scheduleRouteCopy } from '$lib/constants/kakao';
	import { STAND_UP_BOARD_LABEL, STAND_UP_WALK_LABEL } from '$lib/constants/recommendation';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { standUpStartsWithWalk, transitLineLabel } from '$lib/utils/route-label';
	import { formatClock, formatDurationMinutes, fromIso } from '$lib/utils/time';

	$effect(() => {
		if (tripSession.status === 'idle') {
			void goto(resolve('/'));
		}
	});
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/')} onclick={() => tripSession.resetResult()}>← 홈</a>
	<h1 class="nav-title">오늘의 퇴근각</h1>
	<span></span>
</header>

{#if tripSession.status === 'calculating'}
	<p class="status-copy">오늘의 퇴근각을 계산하고 있습니다.</p>
	<SkeletonBlock lines={4} />
{:else if tripSession.status === 'error'}
	<p class="large-title error-title">지금은 추천할 수 없어요</p>
	<p class="status-copy">{tripSession.errorMessage}</p>
	<button class="primary-button" type="button" onclick={() => goto(resolve('/'))}
		>다시 입력하기</button
	>
{:else if tripSession.result && tripSession.trip}
	{@const recommended = tripSession.result.recommended}
	{@const recommendedLine = transitLineLabel(recommended.route.sections)}
	{@const standUpWalk = standUpStartsWithWalk(recommended.route.sections)}
	{@const standUpLabel = standUpWalk ? STAND_UP_WALK_LABEL : STAND_UP_BOARD_LABEL}
	{@const firstRide = recommended.chosenTrips[0]}

	<section class="predicted">
		<p class="hero-time">{formatClock(fromIso(recommended.departureAt))}</p>
		<p class="hero-label">{standUpLabel}</p>
		<p class="hero-route">{recommendedLine}</p>
		<p class="hero-arrival">{formatClock(fromIso(recommended.expectedArrivalAt))} 도착</p>
		<p class="helper predicted-copy">{scheduleRouteCopy(tripSession.result.scheduleSource)}</p>
		{#if tripSession.explanation}
			<p class="summary">{tripSession.explanation.summary}</p>
		{/if}

		<section class="card stats">
			<p class="route-line">{tripSession.trip.origin.name} → {tripSession.trip.destination.name}</p>
			<div class="stat-row">
				<span>{standUpWalk ? '일어나서 걷기' : '승차'}</span>
				<strong>{formatClock(fromIso(recommended.departureAt))}</strong>
			</div>
			<div class="stat-row">
				<span>이용 노선</span>
				<strong>{recommendedLine}</strong>
			</div>
			{#if firstRide && standUpWalk}
				<div class="stat-row">
					<span>승차</span>
					<strong>{formatClock(fromIso(firstRide.boardTime))}</strong>
				</div>
			{/if}
			<div class="stat-row">
				<span>예상 도착</span>
				<strong>{formatClock(fromIso(recommended.expectedArrivalAt))}</strong>
			</div>
			<div class="stat-row">
				<span>예상 소요시간</span>
				<strong>{formatDurationMinutes(recommended.totalTimeSeconds)}</strong>
			</div>
			<div class="stat-row">
				<span>예상 도보시간</span>
				<strong>{formatDurationMinutes(recommended.walkingTimeSeconds)}</strong>
			</div>
			{#if recommended.waitingTimeSeconds > 0}
				<div class="stat-row">
					<span>예상 대기시간</span>
					<strong>{formatDurationMinutes(recommended.waitingTimeSeconds)}</strong>
				</div>
			{/if}
		</section>

		{#if recommended.headwayLoss}
			<WaitComparison loss={recommended.headwayLoss} />
		{/if}

		{#if tripSession.explanation}
			<div class="card reasons">
				{#each tripSession.explanation.details as detail, index (index)}
					<p>{detail}</p>
				{/each}
			</div>
		{/if}

		<a class="primary-button link-button" href={resolve('/result/route')}>이 경로 보기</a>
	</section>
{/if}

<style>
	.helper {
		margin: 0 0 12px;
		color: var(--color-secondary-label);
		font-size: 13px;
		line-height: 1.4;
	}

	.hero-route {
		margin: 4px 0 0;
		color: var(--color-label);
		font-size: 17px;
		font-weight: 600;
		text-align: center;
	}

	.hero-arrival {
		margin: 4px 0 8px;
		color: var(--color-secondary-label);
		font-size: 17px;
		font-weight: 600;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.predicted-copy {
		text-align: center;
	}

	.hero-time {
		margin: 24px 0 0;
		font-size: var(--hero-size);
		font-weight: 700;
		letter-spacing: -0.06em;
		line-height: 1;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.hero-label,
	.summary {
		text-align: center;
	}

	.hero-label {
		margin: 8px 0 8px;
		color: var(--color-label);
		font-size: 17px;
	}

	.summary {
		margin: 0 0 24px;
		color: var(--color-secondary-label);
		font-size: 17px;
		line-height: 1.45;
	}

	.stats,
	.reasons {
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

	.reasons p {
		margin: 0 0 10px;
		color: var(--color-secondary-label);
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
</style>
