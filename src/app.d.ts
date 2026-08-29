declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	namespace kakao {
		namespace maps {
			function load(callback: () => void): void;

			namespace services {
				const Status: {
					OK: 'OK';
					ZERO_RESULT: 'ZERO_RESULT';
					ERROR: 'ERROR';
				};

				type StatusCode = 'OK' | 'ZERO_RESULT' | 'ERROR';

				class Places {
					keywordSearch(
						keyword: string,
						callback: (data: KakaoKeywordPlace[], status: StatusCode) => void
					): void;
				}
			}
		}
	}

	interface KakaoKeywordPlace {
		id: string;
		place_name: string;
		address_name: string;
		road_address_name: string;
		x: string;
		y: string;
	}

	interface Window {
		kakao?: typeof kakao;
	}
}

export {};
