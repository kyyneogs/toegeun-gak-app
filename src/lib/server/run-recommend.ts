import { env } from '$env/dynamic/private';
import { getServerKakaoRouteProvider } from '$lib/adapters/kakao/kakao-server';
import { MockRouteProvider } from '$lib/adapters/mock/mock-route-provider';
import { RecommendationApplicationService } from '$lib/application/recommendation/recommendation-service';
import { TripApplicationService } from '$lib/application/trip/trip-service';
import { isKakaoRestKeyConfigured } from '$lib/constants/kakao';
import { localGtfsDirectory } from '$lib/constants/gtfs-paths';
import type { RouteCriterion } from '$lib/domain/recommendation/criteria';
import type { RecommendationResult } from '$lib/domain/recommendation/types';
import {
	saveRecommendationSnapshot,
	snapshotFromResult
} from '$lib/server/recommendation-snapshots';
import { fromIso } from '$lib/utils/time';

export async function runServerRecommendation(input: {
	originName: string;
	originLatitude: number;
	originLongitude: number;
	destinationName: string;
	destinationLatitude: number;
	destinationLongitude: number;
	departureFrom: string;
	desiredArrivalAt?: string;
	criterion?: RouteCriterion;
}): Promise<RecommendationResult> {
	const restKey = env.KAKAO_REST_API_KEY?.trim() ?? '';
	const gtfsDir = localGtfsDirectory(env.GTFS_DIR);
	const provider = isKakaoRestKeyConfigured(restKey)
		? getServerKakaoRouteProvider(restKey, gtfsDir)
		: new MockRouteProvider();
	const trip = await new TripApplicationService().createTrip({
		origin: {
			id: 'origin',
			name: input.originName,
			address: input.originName,
			latitude: input.originLatitude,
			longitude: input.originLongitude,
			provider: 'kakao',
			providerPlaceId: 'origin',
			createdAt: input.departureFrom,
			updatedAt: input.departureFrom
		},
		destination: {
			id: 'destination',
			name: input.destinationName,
			address: input.destinationName,
			latitude: input.destinationLatitude,
			longitude: input.destinationLongitude,
			provider: 'kakao',
			providerPlaceId: 'destination',
			createdAt: input.departureFrom,
			updatedAt: input.departureFrom
		},
		departureFrom: fromIso(input.departureFrom),
		desiredArrivalAt: input.desiredArrivalAt ? fromIso(input.desiredArrivalAt) : undefined
	});
	const result = await new RecommendationApplicationService(provider).recommend({
		trip,
		criterion: input.criterion
	});
	await saveRecommendationSnapshot(
		result.id,
		snapshotFromResult(result, trip.origin.name, trip.destination.name)
	);
	return result;
}
