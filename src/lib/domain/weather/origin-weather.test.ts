import { WEATHER_LOOKUP_TIMEOUT_MS } from '$lib/constants/persist';
import { fetchOriginWeather } from '$lib/adapters/weather/open-meteo-weather';
import {
	WEATHER_SUMMARY_RAIN,
	describeWeatherCode,
	parseOpenMeteoCurrent
} from '$lib/domain/weather/origin-weather';
import { describe, expect, it } from 'vitest';

describe('describeWeatherCode', () => {
	it('treats rain codes and any precipitation as rain', () => {
		expect(describeWeatherCode(61, 0)).toBe(WEATHER_SUMMARY_RAIN);
		expect(describeWeatherCode(0, 0.4)).toBe(WEATHER_SUMMARY_RAIN);
		expect(describeWeatherCode(71, 1)).toBe('눈');
		expect(describeWeatherCode(0, 0)).toBe('맑음');
	});
});

describe('parseOpenMeteoCurrent', () => {
	it('reads the current block', () => {
		expect(
			parseOpenMeteoCurrent({
				current: { temperature_2m: 18.4, precipitation: 1.24, weather_code: 61 }
			})
		).toEqual({
			summary: WEATHER_SUMMARY_RAIN,
			temperatureC: 18,
			precipitationMm: 1.2
		});
	});

	it('rejects a payload without current weather', () => {
		expect(parseOpenMeteoCurrent({ current: {} })).toBeNull();
	});
});

describe('fetchOriginWeather', () => {
	it('requests the origin grid and parses the body', async () => {
		const fetchImpl: typeof fetch = async (input, init) => {
			const url = new URL(String(input));
			expect(url.searchParams.get('latitude')).toBe('37.43');
			expect(url.searchParams.get('current')).toContain('weather_code');
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			expect(WEATHER_LOOKUP_TIMEOUT_MS).toBe(1500);
			return new Response(
				JSON.stringify({
					current: { temperature_2m: 9, precipitation: 0, weather_code: 3 }
				}),
				{ status: 200 }
			);
		};

		await expect(fetchOriginWeather(37.43, 127.13, fetchImpl)).resolves.toEqual({
			summary: '흐림',
			temperatureC: 9,
			precipitationMm: 0
		});
	});

	it('throws when the weather service is not ok', async () => {
		const fetchImpl: typeof fetch = async () => new Response('no', { status: 503 });
		await expect(fetchOriginWeather(37.43, 127.13, fetchImpl)).rejects.toThrow(/503/);
	});
});
