<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		EMAIL_LABEL,
		LOGIN_TITLE,
		NICKNAME_LABEL,
		PASSWORD_LABEL,
		REGISTER_CTA,
		REGISTER_TITLE
	} from '$lib/constants/recommendation';
	import { sessionStore } from '$lib/stores/session.svelte';

	let email = $state('');
	let password = $state('');
	let nickname = $state('');

	async function submit(event: Event): Promise<void> {
		event.preventDefault();
		const ok = await sessionStore.register(email, password, nickname);

		if (ok) {
			await goto(resolve('/'));
		}
	}
</script>

<header class="nav-row">
	<a class="nav-link" href={resolve('/login')}>← {LOGIN_TITLE}</a>
	<h1 class="nav-title">{REGISTER_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{REGISTER_TITLE}</p>
<p class="status-copy">닉네임은 랭킹에 동의하면 다른 사람에게 보여요.</p>

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

<style>
	.form {
		display: grid;
		gap: 8px;
	}
</style>
