<script lang="ts">
	import { PLACE_SEARCH_DEBOUNCE_MS, SEARCHING_COPY } from '$lib/constants/recommendation';
	import type { Place } from '$lib/domain/place/place';
	import { getAppServices } from '$lib/application/composition';

	interface Props {
		selected?: Place | null;
		placeholder?: string;
		onSelect?: (place: Place) => void;
	}

	let { selected = null, placeholder = '장소 검색', onSelect }: Props = $props();
	let query = $state('');
	let results = $state<Place[]>([]);
	let open = $state(false);
	let searching = $state(false);
	let debounceHandle: ReturnType<typeof setTimeout> | undefined;
	let lastSyncedPlaceId: string | null = null;

	$effect(() => {
		const selectedId = selected?.id ?? null;

		if (selectedId && selectedId !== lastSyncedPlaceId && selected) {
			query = selected.name;
			lastSyncedPlaceId = selectedId;
		}
	});

	function scheduleSearch(rawQuery: string): void {
		if (debounceHandle) {
			clearTimeout(debounceHandle);
		}

		const currentQuery = rawQuery.trim();

		if (!currentQuery || currentQuery === selected?.name) {
			results = [];
			open = false;
			return;
		}

		debounceHandle = setTimeout(() => {
			void runSearch(currentQuery);
		}, PLACE_SEARCH_DEBOUNCE_MS);
	}

	async function runSearch(value: string): Promise<void> {
		searching = true;

		try {
			results = await getAppServices().placeService.search(value);
			open = results.length > 0;
		} catch (cause) {
			console.error('Place search failed', cause);
			results = [];
			open = false;
		} finally {
			searching = false;
		}
	}

	function handleInput(event: Event): void {
		const value = (event.currentTarget as HTMLInputElement).value;
		query = value;
		scheduleSearch(value);
	}

	function choose(place: Place): void {
		query = place.name;
		lastSyncedPlaceId = place.id;
		open = false;
		results = [];
		onSelect?.(place);
	}
</script>

<div class="search" class:open>
	<input
		class="text-input"
		type="search"
		{placeholder}
		value={query}
		autocomplete="off"
		oninput={handleInput}
		onfocus={() => {
			if (results.length > 0) {
				open = true;
			}
		}}
	/>
	{#if searching}
		<p class="helper">{SEARCHING_COPY}</p>
	{/if}
	{#if open}
		<ul class="results">
			{#each results as place (place.id)}
				<li>
					<button type="button" class="result-row" onclick={() => choose(place)}>
						<span class="result-name">{place.name}</span>
						<span class="result-address">{place.address}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search {
		position: relative;
		z-index: 1;
	}

	.search.open {
		z-index: 12;
	}

	.results {
		position: absolute;
		z-index: 13;
		left: 0;
		right: 0;
		top: calc(100% + 8px);
		margin: 0;
		padding: 6px 0;
		list-style: none;
		background: var(--color-card);
		border-radius: var(--radius-card);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.12);
	}

	.result-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		padding: 12px 16px;
		border: 0;
		background: transparent;
		text-align: left;
	}

	.result-name {
		font-weight: 600;
	}

	.result-address {
		margin-top: 2px;
		color: var(--color-label);
		font-size: 13px;
	}
</style>
