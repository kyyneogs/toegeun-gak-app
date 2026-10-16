export const WEATHER_SUMMARY_CLEAR = '맑음';
export const WEATHER_SUMMARY_CLOUD = '흐림';
export const WEATHER_SUMMARY_FOG = '안개';
export const WEATHER_SUMMARY_RAIN = '비';
export const WEATHER_SUMMARY_SNOW = '눈';
export const WEATHER_SUMMARY_UNKNOWN = '날씨';

const CLEAR_WEATHER_CODES = new Set([0]);
const CLOUD_WEATHER_CODES = new Set([1, 2, 3]);
const FOG_WEATHER_CODES = new Set([45, 48]);
const RAIN_WEATHER_CODES = new Set([
	51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99
]);
const SNOW_WEATHER_CODES = new Set([71, 73, 75, 77, 85, 86]);

export interface OriginWeather {
	summary: string;
	temperatureC: number;
	precipitationMm: number;
}

export function describeWeatherCode(code: number, precipitationMm: number): string {
	if (SNOW_WEATHER_CODES.has(code)) {
		return WEATHER_SUMMARY_SNOW;
	}

	if (RAIN_WEATHER_CODES.has(code) || precipitationMm > 0) {
		return WEATHER_SUMMARY_RAIN;
	}

	if (FOG_WEATHER_CODES.has(code)) {
		return WEATHER_SUMMARY_FOG;
	}

	if (CLOUD_WEATHER_CODES.has(code)) {
		return WEATHER_SUMMARY_CLOUD;
	}

	if (CLEAR_WEATHER_CODES.has(code)) {
		return WEATHER_SUMMARY_CLEAR;
	}

	return WEATHER_SUMMARY_UNKNOWN;
}

export function parseOpenMeteoCurrent(payload: unknown): OriginWeather | null {
	if (!payload || typeof payload !== 'object' || !('current' in payload)) {
		return null;
	}

	const current = payload.current;

	if (!current || typeof current !== 'object') {
		return null;
	}

	const row = current as Record<string, unknown>;
	const temperature = row.temperature_2m;
	const precipitation = row.precipitation;
	const code = row.weather_code;

	if (
		typeof temperature !== 'number' ||
		typeof precipitation !== 'number' ||
		typeof code !== 'number' ||
		!Number.isFinite(temperature) ||
		!Number.isFinite(precipitation) ||
		!Number.isFinite(code)
	) {
		return null;
	}

	const precipitationMm = Math.round(precipitation * 10) / 10;

	return {
		summary: describeWeatherCode(code, precipitationMm),
		temperatureC: Math.round(temperature),
		precipitationMm
	};
}
