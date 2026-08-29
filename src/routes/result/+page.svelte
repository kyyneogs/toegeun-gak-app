<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CandidateTable from '$lib/components/CandidateTable.svelte';
	import SkeletonBlock from '$lib/components/SkeletonBlock.svelte';
	import { KAKAO_LIVE_ROUTE_COPY, scheduleRouteCopy } from '$lib/constants/kakao';
	import { tripSession } from '$lib/stores/trip-session.svelte';
	import { formatClock, formatDurationMinutes, fromIso } from '$lib/utils/time';

	let showReasons = $state(false);

	$effect(() => {
		if (tripSession.status === 'idle') {
			void goto(resolve('/'));
		}
	});

	function liveRouteLabel(sections: { routeName?: string; type: string }[]): string {
		const names = sections
			.map((section) => section.routeName)
			.filter((name): name is string => Boolean(name));
		return names.length > 0 ? names.join(' · ') : '도보 포함 경로';
	}
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
	{@const liveRoute = tripSession.result.liveRoute}

	{#if liveRoute}
		<section class="field-block">
			<div class="section-head">
				<p class="section-label">지금 경로</p>
				<span class="live-pill">실시간</span>
			</div>
			<p class="helper">{KAKAO_LIVE_ROUTE_COPY}</p>
			<section class="card stats">
				<p class="route-line">
					{tripSession.trip.origin.name} → {tripSession.trip.destination.name}
				</p>
				<p class="route-meta">{liveRouteLabel(liveRoute.sections)}</p>
				<div class="stat-row">
					<span>소요시간</span>
					<strong>{formatDurationMinutes(liveRoute.totalTimeSeconds)}</strong>
				</div>
				<div class="stat-row">
					<span>환승</span>
					<strong>{liveRoute.transferCount}회</strong>
				</div>
			</section>
			<a
				class="ghost-button link-button"
				href={resolve('/result/route')}
				onclick={() => tripSession.openRouteDetail('live')}
			>
				실시간 경로 자세히 보기
			</a>
		</section>
	{/if}

	<section class="predicted">
		<p class="hero-time">{formatClock(fromIso(recommended.departureAt))}</p>
		<p class="hero-label">예상 퇴근각</p>
		<p class="helper predicted-copy">{scheduleRouteCopy(tripSession.result.scheduleSource)}</p>
		{#if tripSession.explanation}
			<p class="summary">{tripSession.explanation.summary}</p>
		{/if}

		<section class="card stats">
			<p class="route-line">{tripSession.trip.origin.name} → {tripSession.trip.destination.name}</p>
			<div class="stat-row">
				<span>예상 소요시간</span>
				<strong>{formatDurationMinutes(recommended.totalTimeSeconds)}</strong>
			</div>
			<div class="stat-row">
				<span>예상 대기시간</span>
				<strong>{formatDurationMinutes(recommended.waitingTimeSeconds)}</strong>
			</div>
			<div class="stat-row">
				<span>예상 도착</span>
				<strong>{formatClock(fromIso(recommended.expectedArrivalAt))}</strong>
			</div>
		</section>

		<button class="ghost-button" type="button" onclick={() => (showReasons = !showReasons)}>
			{showReasons ? '추천 이유 접기' : '추천 이유 보기'}
		</button>

		{#if showReasons && tripSession.explanation}
			<div class="card reasons">
				{#each tripSession.explanation.details as detail, index (index)}
					<p>{detail}</p>
				{/each}
			</div>
		{/if}

		<section class="field-block">
			<p class="section-label">다른 시간은?</p>
			<CandidateTable
				candidates={tripSession.result.alternatives}
				recommendedDepartureAt={recommended.departureAt}
			/>
		</section>

		<a
			class="primary-button link-button"
			href={resolve('/result/route')}
			onclick={() => tripSession.openRouteDetail('predicted')}
		>
			이 시각 경로 보기
		</a>
	</section>
{/if}

<style>
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.live-pill {
		padding: 3px 8px;
		border-radius: var(--radius-pill);
		background: #007aff24;
		color: var(--color-accent);
		font-size: 12px;
		font-weight: 600;
	}

	.helper {
		margin: 0 0 12px;
		color: var(--color-secondary-label);
		font-size: 13px;
		line-height: 1.4;
	}

	.predicted {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--color-separator);
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

	.route-meta {
		margin: -4px 0 8px;
		color: var(--color-secondary-label);
		font-size: 14px;
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
