import {
	KAKAO_CONNECTION_FAILURE_MESSAGE,
	PLACE_CONNECTION_PROBE_QUERY
} from '$lib/constants/kakao';
import type {
	PlaceBackendKind,
	PlaceConnectionResult,
	PlaceConnectionService
} from '$lib/ports/place-connection';
import type { PlaceService } from '$lib/ports/place-service';

export class PlaceConnectionChecker implements PlaceConnectionService {
	constructor(
		private readonly backend: PlaceBackendKind,
		private readonly placeService: PlaceService
	) {}

	async check(): Promise<PlaceConnectionResult> {
		if (this.backend === 'mock') {
			return this.checkMock();
		}

		return this.checkKakao();
	}

	private async checkMock(): Promise<PlaceConnectionResult> {
		try {
			const places = await this.placeService.search(PLACE_CONNECTION_PROBE_QUERY);

			if (places.length === 0) {
				return {
					backend: 'mock',
					ok: false,
					message: 'Mock 장소 검색이 비어 있어요.'
				};
			}

			return {
				backend: 'mock',
				ok: true,
				message: 'Kakao 키가 없어 Mock 장소 검색을 쓰고 있어요.',
				samplePlaceName: places[0].name
			};
		} catch (cause) {
			console.error('Mock place connection check failed', cause);
			return {
				backend: 'mock',
				ok: false,
				message: 'Mock 장소 검색을 확인하지 못했어요.'
			};
		}
	}

	private async checkKakao(): Promise<PlaceConnectionResult> {
		try {
			const places = await this.placeService.search(PLACE_CONNECTION_PROBE_QUERY);

			if (places.length === 0) {
				return {
					backend: 'kakao',
					ok: true,
					message: 'Kakao에 연결됐지만 검색 결과가 없어요. 사이트 도메인 등록을 확인해 주세요.'
				};
			}

			return {
				backend: 'kakao',
				ok: true,
				message: 'Kakao 장소 검색에 연결됐어요.',
				samplePlaceName: places[0].name
			};
		} catch (cause) {
			console.error('Kakao place connection check failed', cause);
			return {
				backend: 'kakao',
				ok: false,
				message: KAKAO_CONNECTION_FAILURE_MESSAGE
			};
		}
	}
}
