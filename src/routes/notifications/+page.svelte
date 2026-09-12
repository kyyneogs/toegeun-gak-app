<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		LOGIN_TITLE,
		RESULT_ROUTE_CTA,
		STANDUP_CANCEL_ARIA,
		STANDUP_CANCEL_HELPER,
		STANDUP_CANCEL_MARK,
		STANDUP_PAGE_TITLE,
		STANDUP_SCHEDULED_EMPTY,
		STANDUP_SCHEDULED_LOGIN
	} from '$lib/constants/recommendation';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatClock, fromIso } from '$lib/utils/time';

	$effect(() => {
		if (!sessionStore.loaded || !sessionStore.user) {
			return;
		}

		void sessionStore.loadStandupJobs();
	});
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/')}>← 홈</a>
	<h1 class="nav-title">{STANDUP_PAGE_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{STANDUP_PAGE_TITLE}</p>

{#if !sessionStore.user}
	<p class="helper">{STANDUP_SCHEDULED_LOGIN}</p>
	<a class="nav-link" href={resolve('/login')}>{LOGIN_TITLE}</a>
{:else if sessionStore.standupJobs.length === 0}
	<p class="helper">{STANDUP_SCHEDULED_EMPTY}</p>
{:else}
	<p class="helper">{STANDUP_CANCEL_HELPER}</p>
	<ul class="job-list">
		{#each sessionStore.standupJobs as job (job.id)}
			<li class="job-card">
				<div class="job-copy">
					{#if job.route}
						<p class="job-path">{job.route.originName} → {job.route.destinationName}</p>
						<p class="helper">{job.route.lineLabel}</p>
					{/if}
					<p class="job-body">{job.body}</p>
					<p class="helper job-time">{formatClock(fromIso(job.fireAt))}</p>
					<a class="nav-link" href={resolve('/notifications/[jobId]', { jobId: job.id })}
						>{RESULT_ROUTE_CTA}</a
					>
				</div>
				<button
					class="icon-button"
					type="button"
					aria-label={STANDUP_CANCEL_ARIA}
					onclick={() => sessionStore.cancelStandupJob(job.id)}>{STANDUP_CANCEL_MARK}</button
				>
			</li>
		{/each}
	</ul>
	{#if sessionStore.errorMessage}
		<p class="helper">{sessionStore.errorMessage}</p>
	{/if}
{/if}

<style>
	.job-list {
		display: grid;
		gap: 16px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}

	.job-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.job-copy {
		min-width: 0;
	}

	.job-path,
	.job-body {
		margin: 0;
		font-size: 15px;
	}

	.job-path {
		font-weight: 600;
	}

	.job-time {
		margin: 4px 0 8px;
	}

	.icon-button {
		flex: none;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: 22px;
		background: transparent;
		color: var(--color-secondary-label);
		font-size: 22px;
		line-height: 1;
	}
</style>
