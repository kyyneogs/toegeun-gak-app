export function transitLineLabel(sections: { routeName?: string }[]): string {
	const names = sections
		.map((section) => section.routeName)
		.filter((name): name is string => Boolean(name));

	return names.length > 0 ? names.join(' · ') : '도보 포함 경로';
}

export function chosenTripLineLabel(routeIds: string[]): string {
	return routeIds.filter((routeId) => routeId.trim().length > 0).join(' · ');
}

export function standUpStartsWithWalk(sections: { type: string }[]): boolean {
	const firstAction = sections.find((section) => section.type !== 'wait');
	return firstAction?.type === 'walk';
}
