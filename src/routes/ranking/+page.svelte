<script lang="ts">
	import BackLink from '$lib/components/BackLink.svelte';
	import { RANKING_EMPTY, RANKING_SAVED_LABEL, RANKING_TITLE } from '$lib/constants/recommendation';
	import type { RankingEntry } from '$lib/domain/commit/types';

	let saved = $state<RankingEntry[]>([]);
	let loaded = $state(false);

	$effect(() => {
		void fetch('/api/ranking')
			.then((response) => response.json())
			.then((payload: { saved: RankingEntry[] }) => {
				saved = payload.saved ?? [];
				loaded = true;
			})
			.catch((cause) => {
				console.error('Ranking load failed', cause);
				loaded = true;
			});
	});
</script>

<header class="nav-row">
	<BackLink fallback="/settings" />
	<h1 class="nav-title">{RANKING_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{RANKING_TITLE}</p>

{#if loaded && saved.length === 0}
	<p class="status-copy">{RANKING_EMPTY}</p>
{:else}
	<section class="field-block">
		<p class="section-label">{RANKING_SAVED_LABEL}</p>
		<ol class="card list">
			{#each saved as entry, index (`${entry.nickname}-${index}`)}
				<li>
					<span>{index + 1}. {entry.nickname}</span>
					<strong>{entry.savedLabel}</strong>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.list {
		margin: 0;
		padding: 8px 16px;
		list-style: none;
	}

	.list li {
		display: flex;
		justify-content: space-between;
		padding: 12px 0;
	}

	.list li + li {
		border-top: 0.5px solid var(--color-separator);
	}
</style>
