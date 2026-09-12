<script lang="ts">
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import {
		LOGIN_TITLE,
		RECORD_EMPTY,
		RECORD_LIFE_LABEL,
		RECORD_MONTH_LABEL,
		RECORD_TITLE,
		RECORD_WEEK_LABEL
	} from '$lib/constants/recommendation';
	import type { SavedTimeSummary } from '$lib/domain/commit/types';
	import { fetchSavedSummary, sessionStore } from '$lib/stores/session.svelte';

	let summary = $state<SavedTimeSummary | null>(null);

	$effect(() => {
		if (!sessionStore.loaded) {
			return;
		}

		if (!sessionStore.user) {
			summary = null;
			return;
		}

		void fetchSavedSummary().then((value) => {
			summary = value;
		});
	});
</script>

<header class="nav-row">
	<BackLink fallback="/settings" />
	<h1 class="nav-title">{RECORD_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{RECORD_TITLE}</p>

{#if !sessionStore.user}
	<p class="status-copy">기록을 보려면 로그인해 주세요.</p>
	<a class="primary-button link" href={resolve('/login')}>{LOGIN_TITLE}</a>
{:else if !summary || summary.commitCount === 0}
	<p class="status-copy">{RECORD_EMPTY}</p>
{:else}
	<section class="card stats">
		<div class="stat-row">
			<span>{RECORD_WEEK_LABEL}</span>
			<strong>{summary.weekLabel}</strong>
		</div>
		<div class="stat-row">
			<span>{RECORD_MONTH_LABEL}</span>
			<strong>{summary.monthLabel}</strong>
		</div>
		<div class="stat-row">
			<span>{RECORD_LIFE_LABEL}</span>
			<strong>{summary.lifetimeLabel}</strong>
		</div>
	</section>
{/if}

<style>
	.stats {
		padding: 16px;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
	}

	.link {
		margin-top: 16px;
		text-decoration: none;
	}
</style>
