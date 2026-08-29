export type PlaceBackendKind = 'kakao' | 'mock';

export interface PlaceConnectionResult {
	backend: PlaceBackendKind;
	ok: boolean;
	message: string;
	samplePlaceName?: string;
}

export interface PlaceConnectionService {
	check(): Promise<PlaceConnectionResult>;
}
