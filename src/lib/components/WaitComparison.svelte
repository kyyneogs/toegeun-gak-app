<script lang="ts">
	import { HEADWAY_LOSS_TITLE } from '$lib/constants/recommendation';
	import { headwayLossCopy } from '$lib/domain/optimization/headway-loss';
	import type { HeadwayLoss } from '$lib/domain/route/route';

	interface Props {
		loss: HeadwayLoss;
	}

	let { loss }: Props = $props();
</script>

<section class="card comparison">
	<h2 class="title">{HEADWAY_LOSS_TITLE}</h2>
	<p class="copy">{headwayLossCopy(loss)}</p>
</section>

<style>
	.comparison {
		padding: 16px;
		margin-bottom: 8px;
	}

	.title {
		margin: 0 0 6px;
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.copy {
		margin: 0;
		color: var(--color-secondary-label);
		font-size: 15px;
		line-height: 1.45;
	}
</style>
