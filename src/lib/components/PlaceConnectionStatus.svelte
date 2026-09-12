<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppServices } from '$lib/application/composition';
	import {
		CONNECTION_CHECK_AGAIN,
		CONNECTION_CHECKING_COPY,
		CONNECTION_CHECKING_LABEL,
		CONNECTION_FAILED_COPY
	} from '$lib/constants/recommendation';
	import type { PlaceConnectionResult } from '$lib/ports/place-connection';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
	let status = $state<'idle' | 'checking'>('idle');
	let result = $state<PlaceConnectionResult | null>(null);
	const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;

	onMount(() => {
		void runCheck();
	});

	async function runCheck(): Promise<void> {
		status = 'checking';

		try {
			result = await getAppServices().placeConnection.check();
		} catch (cause) {
			console.error('Place connection check failed', cause);
			result = {
				backend: 'kakao',
				ok: false,
				message: CONNECTION_FAILED_COPY
			};
		} finally {
			status = 'idle';
		}
	}

	const tone = $derived(
		status === 'checking'
			? 'pending'
			: result?.ok
				? result.backend === 'kakao'
					? 'ok'
					: 'mock'
				: 'fail'
	);
	const label = $derived(
		status === 'checking'
			? CONNECTION_CHECKING_LABEL
			: result?.backend === 'mock'
				? 'Mock'
				: result?.ok
					? '연결됨'
					: '실패'
	);
</script>

<div class="status" class:compact role="status" aria-live="polite">
	<div class="row">
		<p class="title">Kakao 장소 검색</p>
		<span class="pill {tone}">{label}</span>
	</div>
	{#if !compact || (result && !result.ok)}
		<p class="helper">
			{#if status === 'checking' && !compact}
				{CONNECTION_CHECKING_COPY}
			{:else if result}
				{result.message}
				{#if result.samplePlaceName}
					· {result.samplePlaceName}
				{/if}
				{#if !compact && !result.ok && currentOrigin}
					지금 주소는 {currentOrigin}이에요.
				{/if}
			{/if}
		</p>
	{/if}
	{#if !compact}
		<button
			class="ghost-button"
			type="button"
			disabled={status === 'checking'}
			onclick={() => runCheck()}
		>
			{CONNECTION_CHECK_AGAIN}
		</button>
	{/if}
</div>

<style>
	.status:not(.compact) {
		padding: 16px;
		background: var(--color-card);
		border-radius: var(--radius-card);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.title {
		margin: 0;
		font-weight: 600;
	}

	.compact .title {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-label);
	}

	.pill {
		padding: 3px 8px;
		border-radius: var(--radius-pill);
		font-size: 12px;
		font-weight: 600;
	}

	.ok {
		background: var(--color-success-fill);
		color: var(--color-success);
	}

	.mock {
		background: var(--color-fill);
		color: var(--color-secondary-label);
	}

	.fail {
		background: #ff3b3024;
		color: var(--color-danger);
	}

	.pending {
		background: var(--color-fill);
		color: var(--color-label);
	}

	.helper {
		margin: 8px 0 4px;
	}

	.compact .helper {
		margin: 4px 0 0;
		font-size: 12px;
		color: var(--color-secondary-label);
	}
</style>
