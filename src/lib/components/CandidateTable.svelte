<script lang="ts">
	import type { ScoredCandidate } from '$lib/domain/recommendation/types';
	import { formatClock, formatDurationMinutes, fromIso } from '$lib/utils/time';

	interface Props {
		candidates: ScoredCandidate[];
		recommendedDepartureAt: string;
	}

	let { candidates, recommendedDepartureAt }: Props = $props();
</script>

<div class="grouped table">
	<div class="head grouped-row">
		<span>출발</span>
		<span>소요</span>
		<span>대기</span>
	</div>
	{#each candidates as candidate (candidate.departureAt)}
		{@const recommended = candidate.departureAt === recommendedDepartureAt}
		<div class="grouped-row row" class:recommended>
			<span class="time">{formatClock(fromIso(candidate.departureAt))}</span>
			<span>{formatDurationMinutes(candidate.totalTimeSeconds)}</span>
			<span class="wait">
				{formatDurationMinutes(candidate.waitingTimeSeconds)}
				{#if recommended}
					<span class="badge">추천</span>
				{/if}
			</span>
		</div>
	{/each}
</div>

<style>
	.head {
		color: var(--color-label);
		font-size: 13px;
		font-weight: 500;
	}

	.row {
		font-variant-numeric: tabular-nums;
	}

	.recommended {
		background: #007aff0f;
	}

	.time {
		font-weight: 600;
		min-width: 52px;
	}

	.wait {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: flex-end;
		min-width: 92px;
	}

	.badge {
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		color: #fff;
		font-size: 11px;
		font-weight: 600;
	}
</style>
