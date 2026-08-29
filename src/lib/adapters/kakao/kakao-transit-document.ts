export interface KakaoTransitStop {
	name?: string;
}

export interface KakaoTransitVehicle {
	type?: string;
	name?: string;
}

export interface KakaoTransitStepProperties {
	guidance?: string;
	type?: string;
	distance?: number;
	time?: number;
	stops?: KakaoTransitStop[];
	vehicles?: KakaoTransitVehicle[];
}

export interface KakaoTransitStep {
	properties?: KakaoTransitStepProperties;
}

export interface KakaoTransitRouteProperties {
	type?: string;
	totalDistance?: number;
	totalTime?: number;
	transfers?: number;
}

export interface KakaoTransitRoute {
	properties?: KakaoTransitRouteProperties;
	steps?: KakaoTransitStep[];
}

export interface KakaoTransitResponse {
	status?: string;
	routes?: KakaoTransitRoute[];
}
