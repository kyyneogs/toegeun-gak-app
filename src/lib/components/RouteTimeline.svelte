<script lang="ts">
	import { TIMELINE_TOTAL_SUFFIX } from '$lib/constants/recommendation';
	import type { RouteSection } from '$lib/domain/route/route';
	import { formatClock, formatDurationMinutes, fromIso, secondsBetween } from '$lib/utils/time';

	interface Props {
		sections: RouteSection[];
		totalTimeSeconds: number;
	}

	let { sections, totalTimeSeconds }: Props = $props();

	const labels: Record<RouteSection['type'], string> = {
		walk: '도보',
		bus: '버스',
		subway: '지하철',
		wait: '대기'
	};

	function sectionDuration(section: RouteSection): number {
		return secondsBetween(fromIso(section.departureAt), fromIso(section.arrivalAt));
	}
</script>

<ol class="timeline">
	{#each sections as section (section.sequence)}
		<li class="step">
			<div class="rail"></div>
			<div class="copy">
				<p class="kind">{labels[section.type]} {formatDurationMinutes(sectionDuration(section))}</p>
				<p class="when">{formatClock(fromIso(section.departureAt))}</p>
				<p class="places">
					{section.startPlaceName}
					{#if section.endPlaceName !== section.startPlaceName}
						→ {section.endPlaceName}
					{/if}
				</p>
				{#if section.routeName}
					<p class="meta">{section.routeName}</p>
				{/if}
			</div>
		</li>
	{/each}
</ol>
<p class="total">모두 {formatDurationMinutes(totalTimeSeconds)}{TIMELINE_TOTAL_SUFFIX}</p>

<style>
	.timeline {
		margin: 0;
		padding: 8px 0 0;
		list-style: none;
	}

	.step {
		position: relative;
		display: grid;
		grid-template-columns: 16px 1fr;
		gap: 12px;
		padding-bottom: 20px;
	}

	.rail {
		width: 10px;
		height: 10px;
		margin-top: 6px;
		border-radius: 50%;
		background: var(--color-accent);
		box-shadow: 0 0 0 4px var(--color-accent-ring);
	}

	.step:not(:last-child) .rail::after {
		content: '';
		position: absolute;
		left: 4px;
		top: 20px;
		bottom: 4px;
		width: 2px;
		background: var(--color-fill);
	}

	.kind {
		margin: 0;
		font-weight: 600;
	}

	.places,
	.meta,
	.total {
		margin: 4px 0 0;
		color: var(--color-secondary-label);
		font-size: 15px;
	}

	.when {
		margin: 4px 0 0;
		color: var(--color-text);
		font-size: 15px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.total {
		padding-top: 8px;
		border-top: 0.5px solid var(--color-separator);
		color: var(--color-text);
		font-weight: 600;
	}
</style>
