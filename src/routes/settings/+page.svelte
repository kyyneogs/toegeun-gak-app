<script lang="ts">
	import PlaceSearchField from '$lib/components/PlaceSearchField.svelte';
	import PlaceConnectionStatus from '$lib/components/PlaceConnectionStatus.svelte';
	import RouteConnectionStatus from '$lib/components/RouteConnectionStatus.svelte';
	import { resolve } from '$app/paths';
	import {
		ACCOUNT_SECTION_LABEL,
		accountIdentityLabel,
		LOGIN_TITLE,
		LOGOUT_CTA,
		NICKNAME_LABEL,
		NICKNAME_SAVE_CTA,
		PUSH_IOS_HINT,
		PUSH_LEAD_HELPER,
		PUSH_LEAD_LABEL,
		RANKING_OPT_IN_LABEL,
		RANKING_TITLE,
		RECORD_TITLE,
		REGISTER_TITLE,
		SETTINGS_DEPARTURE_LABEL,
		SETTINGS_HEADING,
		STANDUP_PAGE_TITLE,
		standupLeadOptionLabel
	} from '$lib/constants/recommendation';
	import { STANDUP_LEAD_MINUTE_OPTIONS, type StandupLeadMinutes } from '$lib/constants/persist';
	import type { Place } from '$lib/domain/place/place';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	function saveOrigin(place: Place): void {
		void settingsStore.saveOrigin(place);
	}

	function saveHome(place: Place): void {
		void settingsStore.saveHome(place);
	}

	function toggleRanking(event: Event): void {
		const checked = (event.currentTarget as HTMLInputElement).checked;
		void sessionStore.saveProfile({ rankingOptIn: checked });
	}

	function saveNickname(): void {
		if (!sessionStore.user) {
			return;
		}

		void sessionStore.saveProfile({ nickname: sessionStore.user.nickname });
	}

	function saveLeadMinutes(minutes: StandupLeadMinutes): void {
		if (sessionStore.user) {
			void sessionStore.saveProfile({ standupLeadMinutes: minutes });
			return;
		}

		void settingsStore.saveStandupLeadMinutes(minutes);
	}
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/')}>← 홈</a>
	<h1 class="nav-title">설정</h1>
	<span></span>
</header>

<p class="large-title">{SETTINGS_HEADING}</p>

<section class="field-block">
	<p class="section-label">{ACCOUNT_SECTION_LABEL}</p>
	{#if sessionStore.user}
		<p class="helper">{accountIdentityLabel(sessionStore.user)}</p>
		<label class="field-block">
			<span class="section-label">{NICKNAME_LABEL}</span>
			<input class="text-input" bind:value={sessionStore.user.nickname} />
		</label>
		<button class="ghost-button" type="button" onclick={saveNickname}>{NICKNAME_SAVE_CTA}</button>
		<label class="opt-in">
			<input type="checkbox" checked={sessionStore.user.rankingOptIn} onchange={toggleRanking} />
			<span>{RANKING_OPT_IN_LABEL}</span>
		</label>
		<button class="ghost-button" type="button" onclick={() => sessionStore.logout()}
			>{LOGOUT_CTA}</button
		>
	{:else}
		<a class="nav-link" href={resolve('/login')}>{LOGIN_TITLE}</a>
		<a class="nav-link" href={resolve('/register')}>{REGISTER_TITLE}</a>
	{/if}
	<div class="link-stack">
		<a class="nav-link" href={resolve('/notifications')}>{STANDUP_PAGE_TITLE}</a>
		<a class="nav-link" href={resolve('/record')}>{RECORD_TITLE}</a>
		<a class="nav-link" href={resolve('/ranking')}>{RANKING_TITLE}</a>
	</div>
</section>

<section class="field-block">
	<p class="section-label">{PUSH_LEAD_LABEL}</p>
	<p class="helper">{PUSH_LEAD_HELPER}</p>
	<div class="chip-row">
		{#each STANDUP_LEAD_MINUTE_OPTIONS as minutes (minutes)}
			<button
				class="chip"
				class:active={settingsStore.standupLeadMinutes === minutes}
				type="button"
				onclick={() => saveLeadMinutes(minutes)}>{standupLeadOptionLabel(minutes)}</button
			>
		{/each}
	</div>
	<p class="helper">{PUSH_IOS_HINT}</p>
	{#if sessionStore.errorMessage}
		<p class="helper">{sessionStore.errorMessage}</p>
	{/if}
</section>

<section class="field-block">
	<p class="section-label">연결</p>
	<div class="connection-stack">
		<PlaceConnectionStatus />
		<RouteConnectionStatus />
	</div>
</section>

<section class="field-block">
	<p class="section-label">출발지</p>
	<PlaceSearchField
		selected={settingsStore.origin}
		placeholder="회사, 판교역"
		onSelect={saveOrigin}
	/>
	<p class="helper">{settingsStore.origin.address}</p>
</section>

<section class="field-block">
	<p class="section-label">{SETTINGS_DEPARTURE_LABEL}</p>
	<div class="card time-wrap">
		<input
			class="time-input"
			type="time"
			bind:value={settingsStore.defaultDepartureFrom}
			onchange={() => settingsStore.saveDefaultDepartureFrom(settingsStore.defaultDepartureFrom)}
		/>
	</div>
</section>

<section class="field-block">
	<p class="section-label">집</p>
	<PlaceSearchField
		selected={settingsStore.home}
		placeholder="우리집, 집 근처 역"
		onSelect={saveHome}
	/>
	{#if settingsStore.home}
		<p class="helper">{settingsStore.home.address}</p>
	{/if}
</section>

<style>
	.connection-stack {
		display: grid;
		gap: 12px;
	}

	.time-wrap {
		display: flex;
		padding: 6px 12px;
	}

	.opt-in {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 12px 0;
	}

	.link-stack {
		display: grid;
		gap: 8px;
		margin-top: 12px;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0 12px;
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
</style>
