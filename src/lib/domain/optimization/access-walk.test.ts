import { withAccessWalks } from '$lib/domain/optimization/access-walk';
import { describe, expect, it } from 'vitest';

describe('withAccessWalks', () => {
	it('prepends and appends walks when Kakao omitted them', () => {
		const topology = withAccessWalks(
			{
				segments: [
					{
						type: 'BUS',
						stopId: '송현초',
						alightStopId: '시청',
						candidateRouteIds: ['341'],
						startPlaceName: '송현초등학교',
						endPlaceName: '성남시청후면'
					}
				]
			},
			'판교로 333',
			'여수동 548',
			8 * 60,
			3 * 60
		);

		expect(topology.segments.map((segment) => segment.type)).toEqual(['WALK', 'BUS', 'WALK']);
		expect(topology.segments[0]).toMatchObject({
			type: 'WALK',
			duration: 480,
			startPlaceName: '판교로 333',
			endPlaceName: '송현초등학교'
		});
		expect(topology.segments[2]).toMatchObject({
			type: 'WALK',
			duration: 180,
			endPlaceName: '여수동 548'
		});
	});

	it('keeps Kakao walks when access time was not measured', () => {
		const topology = withAccessWalks(
			{
				segments: [
					{
						type: 'WALK',
						duration: 120,
						startPlaceName: '회사',
						endPlaceName: '정류장'
					},
					{
						type: 'BUS',
						stopId: '판교역',
						alightStopId: '강남역',
						candidateRouteIds: ['5001'],
						startPlaceName: '판교역',
						endPlaceName: '강남역'
					},
					{
						type: 'WALK',
						duration: 60,
						startPlaceName: '강남역',
						endPlaceName: '집'
					}
				]
			},
			'회사',
			'집',
			null,
			null
		);

		expect(topology.segments).toHaveLength(3);
		expect(topology.segments[0]).toMatchObject({ type: 'WALK', duration: 120 });
		expect(topology.segments[2]).toMatchObject({ type: 'WALK', duration: 60 });
	});

	it('replaces Kakao access walks with measured duration instead of stacking another walk', () => {
		const topology = withAccessWalks(
			{
				segments: [
					{
						type: 'WALK',
						duration: 10,
						startPlaceName: '회사',
						endPlaceName: '정류장'
					},
					{
						type: 'BUS',
						stopId: '판교역',
						alightStopId: '강남역',
						candidateRouteIds: ['5001'],
						startPlaceName: '판교역',
						endPlaceName: '강남역'
					},
					{
						type: 'WALK',
						duration: 5,
						startPlaceName: '강남역',
						endPlaceName: '집'
					}
				]
			},
			'회사',
			'집',
			8 * 60,
			3 * 60
		);

		expect(topology.segments).toHaveLength(3);
		expect(topology.segments[0]).toMatchObject({ type: 'WALK', duration: 480 });
		expect(topology.segments[2]).toMatchObject({ type: 'WALK', duration: 180 });
	});
});
