<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { NAV_BACK } from '$lib/constants/recommendation';

	interface Props {
		fallback: '/' | '/settings' | '/login' | '/notifications' | '/result';
	}

	let { fallback }: Props = $props();
	let canGoBack = $state(false);

	afterNavigate(({ from }) => {
		canGoBack = Boolean(from);
	});

	function handleClick(event: MouseEvent): void {
		if (!canGoBack) {
			return;
		}

		event.preventDefault();
		window.history.back();
	}
</script>

<a class="nav-link" href={resolve(fallback)} onclick={handleClick}>← {NAV_BACK}</a>
