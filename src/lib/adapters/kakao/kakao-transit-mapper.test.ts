import {
	mapKakaoRouteToTemplate,
	pickKakaoTransitRoute
} from '$lib/adapters/kakao/kakao-transit-mapper';
import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { describe, expect, it } from 'vitest';

const PAYLOAD: KakaoTransitResponse = {
	status: 'OK',
	routes: [
		{
			properties: { totalTime: 2400, transfers: 1 },
			steps: []
		},
		{
			properties: { totalTime: 1800, transfers: 0 },
			steps: [
				{
					properties: {
						type: 'WALKING',
						time: 360,
						stops: []
					}
				},
				{
					properties: {
						type: 'BUS',
						time: 1200,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [{ type: '광역', name: '5001' }]
					}
				},
				{
					properties: {
						type: 'WALKING',
						time: 240,
						stops: []
					}
				}
			]
		}
	]
};

describe('kakao transit mapper', () => {
	it('picks the shortest Kakao route', () => {
		const route = pickKakaoTransitRoute(PAYLOAD);
		expect(route?.properties?.totalTime).toBe(1800);
	});

	it('maps walk and bus steps onto a template', () => {
		const route = pickKakaoTransitRoute(PAYLOAD);
		const template = mapKakaoRouteToTemplate(route!, '회사', '집');

		expect(template?.transferCount).toBe(0);
		expect(template?.legs.map((leg) => leg.type)).toEqual(['walk', 'bus', 'walk']);
		expect(template?.legs[0]?.startPlaceName).toBe('회사');
		expect(template?.legs[2]?.endPlaceName).toBe('집');
		expect(template?.legs[1]?.routeName).toBe('광역:5001');
	});
});
