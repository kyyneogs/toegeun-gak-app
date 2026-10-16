import { WEATHER_LOOKUP_TIMEOUT_MS } from '$lib/constants/persist';
import { parseOpenMeteoCurrent, type OriginWeather } from '$lib/domain/weather/origin-weather';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_FIELDS = 'temperature_2m,precipitation,weather_code';

export async function fetchOriginWeather(
	latitude: number,
	longitude: number,
	fetchImpl: typeof fetch = fetch
): Promise<OriginWeather> {
	const url = new URL(OPEN_METEO_FORECAST_URL);
	url.searchParams.set('latitude', String(latitude));
	url.searchParams.set('longitude', String(longitude));
	url.searchParams.set('current', CURRENT_FIELDS);
	url.searchParams.set('timezone', 'Asia/Seoul');

	const response = await fetchImpl(url, {
		signal: AbortSignal.timeout(WEATHER_LOOKUP_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`origin weather lookup failed: ${response.status}`);
	}

	const weather = parseOpenMeteoCurrent(await response.json());

	if (!weather) {
		throw new Error('origin weather lookup failed: missing current');
	}

	return weather;
}
