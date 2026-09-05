import { json } from '@sveltejs/kit';
import { weeklyRanking } from '$lib/server/stats';

export async function GET() {
	const ranking = await weeklyRanking();
	return json(ranking);
}
