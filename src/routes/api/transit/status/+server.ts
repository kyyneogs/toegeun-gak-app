import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isKakaoRestKeyConfigured } from '$lib/constants/kakao';

export function GET() {
	return json({
		configured: isKakaoRestKeyConfigured(env.KAKAO_REST_API_KEY)
	});
}
