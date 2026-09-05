import {
	mapKakaoRouteToLiveTemplate,
	mapKakaoRoutesToTopologies
} from '$lib/adapters/kakao/kakao-transit-mapper';
import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { describe, expect, it } from 'vitest';

const PAYLOAD: KakaoTransitResponse = {
	status: 'OK',
	routes: [
		{
			properties: { totalTime: 2400, transfers: 1 },
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
						time: 9999,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [
							{ type: '광역', name: '5001' },
							{ type: '광역', name: '5002' }
						]
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
		},
		{
			properties: { totalTime: 1800, transfers: 0 },
			steps: [
				{
					properties: {
						type: 'WALKING',
						time: 120,
						stops: []
					}
				},
				{
					properties: {
						type: 'SUBWAY',
						time: 8888,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [{ type: '지하철', name: '2호선' }]
					}
				},
				{
					properties: {
						type: 'WALKING',
						time: 180,
						stops: []
					}
				}
			]
		}
	]
};

describe('kakao transit mapper', () => {
	it('maps every Kakao route and keeps alternative buses', () => {
		const topologies = mapKakaoRoutesToTopologies(PAYLOAD, '회사', '집');

		expect(topologies).toHaveLength(2);
		expect(topologies[0]?.segments.map((segment) => segment.type)).toEqual(['WALK', 'BUS', 'WALK']);
		expect(topologies[1]?.segments.map((segment) => segment.type)).toEqual([
			'WALK',
			'SUBWAY',
			'WALK'
		]);

		const bus = topologies[0]?.segments[1];
		expect(bus && bus.type === 'BUS' ? bus.candidateRouteIds : null).toEqual(['5001', '5002']);

		const subway = topologies[1]?.segments[1];
		expect(subway && subway.type === 'SUBWAY' ? subway.candidateRouteIds : null).toEqual(['2호선']);
	});

	it('does not copy Kakao bus or subway durations onto topology segments', () => {
		const topologies = mapKakaoRoutesToTopologies(PAYLOAD, '회사', '집');
		const bus = topologies[0]?.segments[1];
		const subway = topologies[1]?.segments[1];

		expect(bus && 'duration' in bus).toBe(false);
		expect(subway && 'duration' in subway).toBe(false);
		expect(topologies[0]?.segments[0]).toMatchObject({ type: 'WALK', duration: 360 });
	});

	it('omits zero-duration Kakao walks instead of dropping the route', () => {
		const topologies = mapKakaoRoutesToTopologies(
			{
				status: 'OK',
				routes: [
					{
						steps: [
							{ properties: { type: 'WALKING', time: 0, stops: [] } },
							{
								properties: {
									type: 'BUS',
									time: 800,
									stops: [{ name: '송현초등학교' }, { name: '성남시청후면' }],
									vehicles: [{ name: '341' }]
								}
							}
						]
					}
				]
			},
			'회사',
			'집'
		);

		expect(topologies[0]?.segments.map((segment) => segment.type)).toEqual(['BUS']);
	});

	it('raises short Kakao walks to one minute instead of showing 0분', () => {
		const topologies = mapKakaoRoutesToTopologies(
			{
				status: 'OK',
				routes: [
					{
						steps: [
							{ properties: { type: 'WALKING', time: 12, stops: [] } },
							{
								properties: {
									type: 'BUS',
									time: 800,
									stops: [{ name: '송현초등학교' }, { name: '성남시청후면' }],
									vehicles: [{ name: '341' }]
								}
							},
							{ properties: { type: 'WALKING', time: 8, stops: [] } }
						]
					}
				]
			},
			'회사',
			'집'
		);

		expect(topologies[0]?.segments[0]).toMatchObject({ type: 'WALK', duration: 60 });
		expect(topologies[0]?.segments[2]).toMatchObject({ type: 'WALK', duration: 60 });
	});

	it('maps the first complete Kakao route for the live snapshot, including Kakao times', () => {
		const template = mapKakaoRouteToLiveTemplate(PAYLOAD, '회사', '집');

		expect(template?.legs.map((leg) => leg.type)).toEqual(['walk', 'bus', 'walk']);
		expect(template?.legs[1]?.durationSeconds).toBe(9999);
		expect(template?.legs[0]?.startPlaceName).toBe('회사');
		expect(template?.legs[2]?.endPlaceName).toBe('집');
	});
});
