export interface StopTimePoint {
	stopId: string;
	sequence: number;
	arrivalSeconds: number;
	departureSeconds: number;
}

export function nextBoardAndAlight(
	points: StopTimePoint[],
	boardStops: Set<string>,
	alightStops: Set<string>,
	afterSeconds: number
): { boardSeconds: number; alightSeconds: number } | null {
	let best: { boardSeconds: number; alightSeconds: number } | null = null;

	for (const board of points) {
		if (!boardStops.has(board.stopId) || board.departureSeconds < afterSeconds) {
			continue;
		}

		const alight = points.find(
			(point) => alightStops.has(point.stopId) && point.sequence > board.sequence
		);

		if (!alight) {
			continue;
		}

		if (!best || board.departureSeconds < best.boardSeconds) {
			best = { boardSeconds: board.departureSeconds, alightSeconds: alight.arrivalSeconds };
		}
	}

	return best;
}
