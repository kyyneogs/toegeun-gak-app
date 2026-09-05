export interface BoundingBox {
	south: number;
	north: number;
	west: number;
	east: number;
}

/** 서울시 대략 범위. 행정 폴리곤이 아니라 GTFS 정류장 필터용. */
export const SEOUL_BOUNDING_BOX: BoundingBox = {
	south: 37.428,
	north: 37.701,
	west: 126.764,
	east: 127.183
};

/** 성남시(분당·판교 포함) 대략 범위. */
export const SEONGNAM_BOUNDING_BOX: BoundingBox = {
	south: 37.337,
	north: 37.465,
	west: 127.05,
	east: 127.22
};

export function isPointInBoundingBox(
	latitude: number,
	longitude: number,
	box: BoundingBox
): boolean {
	return (
		latitude >= box.south && latitude <= box.north && longitude >= box.west && longitude <= box.east
	);
}
