<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import AuthSocialButtons from '$lib/components/AuthSocialButtons.svelte';
	import {
		EMAIL_LABEL,
		LOGIN_CTA,
		LOGIN_TITLE,
		PASSWORD_LABEL,
		REGISTER_TITLE,
		RESET_PASSWORD_LINK
	} from '$lib/constants/recommendation';
	import { safeAuthReturnPath } from '$lib/domain/auth/return-path';
	import { sessionStore } from '$lib/stores/session.svelte';

	const next = $derived(safeAuthReturnPath(page.url.searchParams.get('next')));
	const reason = $derived(page.url.searchParams.get('reason'));

	let email = $state('');
	let password = $state('');

	async function submit(event: Event): Promise<void> {
		event.preventDefault();
		const ok = await sessionStore.login(email, password);

		if (ok) {
			await goto(resolve(next));
		}
	}
</script>

<header class="nav-row">
	<BackLink fallback="/settings" />
	<h1 class="nav-title">{LOGIN_TITLE}</h1>
	<span></span>
</header>

<p class="large-title">{LOGIN_TITLE}</p>
<p class="status-copy">알림과 아낀 시간을 다른 기기에서도 이어서 볼게요.</p>

<AuthSocialButtons {next} />

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
			autocomplete="current-password"
			required
		/>
	</label>
	{#if sessionStore.errorMessage || reason}
		<p class="status-copy">{sessionStore.errorMessage ?? reason}</p>
	{/if}
	<button class="primary-button" type="submit">{LOGIN_CTA}</button>
</form>

<p class="status-copy">
	<a class="nav-link" href={resolve('/register')}>{REGISTER_TITLE}</a>
</p>
<p class="status-copy">
	<a class="nav-link" href={resolve('/auth/reset')}>{RESET_PASSWORD_LINK}</a>
</p>

<style>
	.form {
		display: grid;
		gap: 8px;
	}
</style>
