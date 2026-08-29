export type PlaceProviderName = 'kakao' | 'mock';

export interface Place {
	id: string;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
	provider: PlaceProviderName;
	providerPlaceId: string;
	createdAt: string;
	updatedAt: string;
}
