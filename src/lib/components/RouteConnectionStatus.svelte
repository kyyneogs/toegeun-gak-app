<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppServices } from '$lib/application/composition';
	import type { RouteConnectionResult } from '$lib/ports/route-connection';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
	let status = $state<'idle' | 'checking'>('idle');
	let result = $state<RouteConnectionResult | null>(null);

	onMount(() => {
		void runCheck(false);
	});

	async function runCheck(probe: boolean): Promise<void> {
		status = 'checking';

		try {
			result = await getAppServices().routeConnection.check({ probe });
		} catch (cause) {
			console.error('Route connection check failed', cause);
			result = {
				backend: 'kakao',
				ok: false,
				message: '연결 상태를 확인하지 못했습니다.'
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
			? '확인 중'
			: result?.backend === 'mock'
				? 'Mock'
				: result?.ok
					? result.verified
						? '연결됨'
						: '설정됨'
					: '실패'
	);
</script>

<div class="status" class:compact role="status" aria-live="polite">
	<div class="row">
		<p class="title">Kakao 경로</p>
		<span class="pill {tone}">{label}</span>
	</div>
	{#if !compact || (result && !result.ok)}
		<p class="helper">
			{#if status === 'checking' && !compact}
				연결을 확인하는 중입니다.
			{:else if result}
				{result.message}
				{#if result.sampleRouteName}
					· {result.sampleRouteName}
				{/if}
			{/if}
		</p>
	{/if}
	{#if !compact}
		<button
			class="ghost-button"
			type="button"
			disabled={status === 'checking'}
			onclick={() => runCheck(true)}
		>
			다시 확인
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
		background: #34c75924;
		color: #248a3d;
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
