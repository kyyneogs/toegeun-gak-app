import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { pickAiRecommendation } from '$lib/application/recommendation/ai-recommendation-service';
import { ClaudeAiRoutePicker } from '$lib/adapters/anthropic/claude-ai-route-picker';
import { fetchAiRoutePick } from '$lib/adapters/http/http-ai-pick';
import { resetDatabaseForTests } from '$lib/server/db';
import {
	loadRecommendationSnapshot,
	saveRecommendationSnapshot,
	snapshotFromResult,
	withAiPickRoute
} from '$lib/server/recommendation-snapshots';
import type { RecommendationResult } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(async () => {
	await resetDatabaseForTests();
});

function makeTimed(id: string): TransitRoute {
	return {
		provider: 'gtfs',
		routeId: id,
		totalTimeSeconds: 1800,
		movingTimeSeconds: 1500,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 300,
		transferCount: 0,
		departureAt: '2026-08-29T09:00:00.000Z',
		arrivalAt: '2026-08-29T09:30:00.000Z',
		sections: [],
		scheduleSource: 'gtfs'
	};
}

function makeResult(): RecommendationResult {
	const route = makeTimed('r1');
	const recommended = {
		departureAt: route.departureAt,
		expectedArrivalAt: route.arrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 300,
		transferCount: 0,
		route,
		chosenTrips: [],
		headwayLoss: null
	};

	return {
		id: 'rec_ai',
		tripId: 'trip_1',
		recommended,
		criterion: 'earliestArrival',
		mode: 'leaveAfter',
		alternatives: [
			{ criterion: 'earliestArrival', route: recommended },
			{ criterion: 'shortestDuration', route: recommended },
			{ criterion: 'leastWalking', route: recommended },
			{ criterion: 'fewestTransfers', route: recommended }
		],
		timedRoutes: [recommended],
		naiveArrivalAt: route.arrivalAt,
		calculatedAt: route.departureAt,
		scheduleSource: 'gtfs'
	};
}

describe('pickAiRecommendation', () => {
	it('merges aiPick into the snapshot after a valid index', async () => {
		const result = makeResult();
		await saveRecommendationSnapshot('rec_ai', snapshotFromResult(result, '모란', '잠실'));
		const pick = await pickAiRecommendation('rec_ai', {
			pick: async () => ({ index: 0, reason: '환승이 없어서 이 길이 나아요.' })
		});
		expect(pick.index).toBe(0);
		const stored = await loadRecommendationSnapshot('rec_ai');
		expect(stored?.routes.some((route) => route.criterion === 'aiPick')).toBe(true);
	});

	it('writes aiPick times for an in-range snapshot candidate', () => {
		const merged = withAiPickRoute(snapshotFromResult(makeResult(), '모란', '잠실'), 0);
		expect(merged.routes.at(-1)?.criterion).toBe('aiPick');
	});

	it('rejects a missing snapshot', async () => {
		try {
			await pickAiRecommendation('missing', {
				pick: async () => ({ index: 0, reason: 'x' })
			});
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.INVALID_REQUEST);
		}
	});

	it('rejects an out-of-range model index', async () => {
		const result = makeResult();
		await saveRecommendationSnapshot('rec_ai', snapshotFromResult(result, '모란', '잠실'));
		try {
			await pickAiRecommendation('rec_ai', {
				pick: async () => ({ index: 9, reason: '없는 길이에요.' })
			});
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.AI_UNAVAILABLE);
		}
	});
});

describe('ClaudeAiRoutePicker', () => {
	it('returns structured output from generateText', async () => {
		const picker = new ClaudeAiRoutePicker('test-key', (async () => ({
			output: { index: 0, reason: '도보가 짧아서 이 길이 나아요.' }
		})) as never);
		const choice = await picker.pick({
			originName: '모란',
			destinationName: '잠실',
			mode: 'leaveAfter',
			candidates: [
				{
					index: 0,
					departureAt: '2026-08-29T09:00:00.000Z',
					arrivalAt: '2026-08-29T09:30:00.000Z',
					totalTimeSeconds: 1800,
					walkingTimeSeconds: 300,
					transferCount: 0,
					lineLabel: '8호선'
				}
			]
		});
		expect(choice.index).toBe(0);
	});
});

describe('fetchAiRoutePick', () => {
	it('posts recommendationId to /api/recommend/ai', async () => {
		const fetchImpl: typeof fetch = async (input, init) => {
			expect(String(input)).toBe('/api/recommend/ai');
			expect(init?.method).toBe('POST');
			expect(JSON.parse(String(init?.body))).toEqual({ recommendationId: 'rec_ai' });
			return new Response(JSON.stringify({ index: 0, reason: '이 길이 나아요.' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		};
		const pick = await fetchAiRoutePick('rec_ai', fetchImpl);
		expect(pick.index).toBe(0);
	});

	it('maps a missing snapshot to INVALID_REQUEST', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					code: ERROR_CODES.INVALID_REQUEST,
					message: '입력값을 다시 확인해 주세요.'
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);

		try {
			await fetchAiRoutePick('missing', fetchImpl);
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.INVALID_REQUEST);
		}
	});

	it('maps a missing key to AI_UNAVAILABLE', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					code: ERROR_CODES.AI_UNAVAILABLE,
					message: '지금은 AI 추천을 쓰지 못해요. 다른 기준을 골라 주세요.'
				}),
				{ status: 502, headers: { 'Content-Type': 'application/json' } }
			);

		try {
			await fetchAiRoutePick('rec_ai', fetchImpl);
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.AI_UNAVAILABLE);
		}
	});
});
