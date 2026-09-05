import { routeShortNameKeys } from '$lib/adapters/gtfs/gtfs-match';

export const CORRIDOR_ROUTE_SHORT_NAMES = [
	'신분당',
	'2호선',
	'수인분당',
	'3호선',
	'8호선',
	'경강',
	'146',
	'5001',
	'5002'
] as const;

export function isCorridorShortName(
	shortName: string,
	allowList: readonly string[] = CORRIDOR_ROUTE_SHORT_NAMES
): boolean {
	return routeShortNameKeys(shortName).some((key) => allowList.some((allowed) => allowed === key));
}

export function corridorAliasesForShortName(shortName: string): string[] {
	return routeShortNameKeys(shortName);
}
