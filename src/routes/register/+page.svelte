<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import AuthSocialButtons from '$lib/components/AuthSocialButtons.svelte';
	import {
		AUTH_PENDING_OK,
		EMAIL_LABEL,
		NICKNAME_LABEL,
		PASSWORD_LABEL,
		REGISTER_CHECK_EMAIL,
		REGISTER_CTA,
		REGISTER_TITLE,
		RESEND_EMAIL_CTA
	} from '$lib/constants/recommendation';
	import { sessionStore } from '$lib/stores/session.svelte';

	let email = $state('');
	let password = $state('');
	let nickname = $state('');
	let pending = $state(false);
	let resending = $state(false);

	async function submit(event: Event): Promise<void> {
		event.preventDefault();
		const result = await sessionStore.register(email, password, nickname);

		if (result === 'ok') {
			await goto(resolve('/'));
			return;
		}

		if (result === 'pending') {
			pending = true;
		}
	}

	async function resend(): Promise<void> {
		resending = true;
		await sessionStore.resendSignupEmail(email);
		resending = false;
	}
</script>

<header class="nav-row">
	<BackLink fallback="/login" />
	<h1 class="nav-title">{REGISTER_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{REGISTER_TITLE}</p>
<p class="status-copy">닉네임은 랭킹에 동의하면 다른 사람에게 보여요.</p>

{#if pending}
	<p class="status-copy">{REGISTER_CHECK_EMAIL}</p>
	<button class="ghost-button" type="button" disabled={resending} onclick={resend}
		>{RESEND_EMAIL_CTA}</button
	>
	<button class="primary-button" type="button" onclick={() => goto(resolve('/login'))}
		>{AUTH_PENDING_OK}</button
	>
{:else}
	<AuthSocialButtons />

	<form class="form" onsubmit={submit}>
		<label class="field-block">
			<span class="section-label">{EMAIL_LABEL}</span>
			<input class="text-input" type="email" bind:value={email} autocomplete="email" required />
		</label>
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
		<label class="field-block">
			<span class="section-label">{NICKNAME_LABEL}</span>
			<input class="text-input" type="text" bind:value={nickname} maxlength="12" required />
		</label>
		{#if sessionStore.errorMessage}
			<p class="status-copy">{sessionStore.errorMessage}</p>
		{/if}
		<button class="primary-button" type="submit">{REGISTER_CTA}</button>
	</form>
{/if}

<style>
	.form {
		display: grid;
		gap: 8px;
	}
</style>
