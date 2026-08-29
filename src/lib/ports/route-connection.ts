export type RouteBackendKind = 'kakao' | 'mock';

export interface TransitConfiguredStatus {
	configured: boolean;
}

export interface RouteConnectionResult {
	backend: RouteBackendKind;
	ok: boolean;
	message: string;
	sampleRouteName?: string;
	verified?: boolean;
}

export interface RouteConnectionCheckOptions {
	probe?: boolean;
}

export interface RouteConnectionService {
	check(options?: RouteConnectionCheckOptions): Promise<RouteConnectionResult>;
}
