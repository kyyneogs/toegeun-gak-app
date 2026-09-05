export const EARTH_RADIUS_METERS = 6_371_000;

export const MIN_WALK_DURATION_SECONDS = 60;

// 횡단·대기 포함. 1.2m/s면 먼 정류장 접근이 너무 싸져 최적에 자주 오른다.
export const WALKING_SPEED_METERS_PER_SECOND = 0.9;

export function walkDurationSeconds(seconds: number): number {
	if (seconds <= 0) {
		return 0;
	}

	return Math.max(MIN_WALK_DURATION_SECONDS, Math.round(seconds));
}
