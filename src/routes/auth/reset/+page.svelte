<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		EMAIL_LABEL,
		LOGIN_TITLE,
		PASSWORD_LABEL,
		RESET_PASSWORD_CTA,
		RESET_PASSWORD_SENT,
		RESET_PASSWORD_TITLE,
		RESET_PASSWORD_UPDATE_CTA
	} from '$lib/constants/recommendation';
	import { sessionStore } from '$lib/stores/session.svelte';

	let email = $state('');
	let password = $state('');
	let sent = $state(false);

	const updating = $derived(sessionStore.loaded && Boolean(sessionStore.user));

	async function requestReset(event: Event): Promise<void> {
		event.preventDefault();
		sent = await sessionStore.requestPasswordReset(email);
	}

	async function updatePassword(event: Event): Promise<void> {
		event.preventDefault();
		const ok = await sessionStore.updatePassword(password);

		if (ok) {
			await goto(resolve('/settings'));
		}
	}
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/login')}>← {LOGIN_TITLE}</a>
	<h1 class="nav-title">{RESET_PASSWORD_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{RESET_PASSWORD_TITLE}</p>

{#if !sessionStore.loaded}
	<p class="status-copy">확인하고 있어요.</p>
{:else if updating}
	<form class="form" onsubmit={updatePassword}>
		<label class="field-block">
			<span class="section-label">{PASSWORD_LABEL}</span>
			<input
				class="text-input"
				type="password"
				bind:value={password}
				autocomplete="new-password"
				minlength="8"
				required
			/>
		</label>
		{#if sessionStore.errorMessage}
			<p class="status-copy">{sessionStore.errorMessage}</p>
		{/if}
		<button class="primary-button" type="submit">{RESET_PASSWORD_UPDATE_CTA}</button>
	</form>
{:else if sent}
	<p class="status-copy">{RESET_PASSWORD_SENT}</p>
{:else}
	<form class="form" onsubmit={requestReset}>
		<label class="field-block">
			<span class="section-label">{EMAIL_LABEL}</span>
			<input class="text-input" type="email" bind:value={email} autocomplete="email" required />
		</label>
		{#if sessionStore.errorMessage}
			<p class="status-copy">{sessionStore.errorMessage}</p>
		{/if}
		<button class="primary-button" type="submit">{RESET_PASSWORD_CTA}</button>
	</form>
{/if}

<style>
	.form {
		display: grid;
		gap: 8px;
	}
</style>
