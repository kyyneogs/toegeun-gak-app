import { json } from '@sveltejs/kit';
import { parseRecommendRequest } from '$lib/adapters/http/recommend-request';
import {
	encodeRecommendStreamEvent,
	recommendErrorEvent
} from '$lib/adapters/http/recommend-stream';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { RECOMMEND_MAX_DURATION_SECONDS } from '$lib/constants/persist';
import { runServerRecommendation } from '$lib/server/run-recommend';

export const config = {
	maxDuration: RECOMMEND_MAX_DURATION_SECONDS
};

export async function POST({ request }) {
	console.info('Recommend request started');
	let body: unknown;

	try {
		body = await request.json();
	} catch (cause) {
		console.error('Recommend request JSON parse failed', cause);
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	const parsed = parseRecommendRequest(body);

	if (!parsed) {
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: Parameters<typeof encodeRecommendStreamEvent>[0]) => {
				controller.enqueue(encoder.encode(encodeRecommendStreamEvent(event)));
			};

			try {
				const result = await runServerRecommendation({
					originName: parsed.origin.name,
					originLatitude: parsed.origin.latitude,
					originLongitude: parsed.origin.longitude,
					destinationName: parsed.destination.name,
					destinationLatitude: parsed.destination.latitude,
					destinationLongitude: parsed.destination.longitude,
					departureFrom: parsed.departureFrom,
					desiredArrivalAt: parsed.desiredArrivalAt,
					criterion: parsed.criterion,
					onProgress: (stage) => send({ type: 'progress', stage })
				});
				send({ type: 'result', result });
			} catch (cause) {
				console.error('Recommend failed', cause);
				send(recommendErrorEvent(cause));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/x-ndjson; charset=utf-8',
			'Cache-Control': 'no-cache'
		}
	});
}
