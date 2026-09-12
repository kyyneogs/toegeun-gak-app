<script lang="ts">
	import { OAUTH_DIVIDER, OAUTH_GOOGLE_CTA, OAUTH_KAKAO_CTA } from '$lib/constants/recommendation';
	import type { AuthReturnPath } from '$lib/domain/auth/return-path';
	import { sessionStore } from '$lib/stores/session.svelte';

	let { next = '/' }: { next?: AuthReturnPath } = $props();
</script>

<div class="oauth">
	<button
		class="ghost-button oauth-button"
		type="button"
		onclick={() => sessionStore.startOAuth('kakao', next)}
	>
		{OAUTH_KAKAO_CTA}
	</button>
	<button
		class="ghost-button oauth-button"
		type="button"
		onclick={() => sessionStore.startOAuth('google', next)}
	>
		{OAUTH_GOOGLE_CTA}
	</button>
	<p class="status-copy">{OAUTH_DIVIDER}</p>
</div>

<style>
	.oauth {
		display: grid;
		gap: 8px;
		margin-bottom: 16px;
	}

	.oauth-button {
		border: 0.5px solid var(--color-separator);
		background: var(--color-card);
	}
</style>
