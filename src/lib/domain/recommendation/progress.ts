export const RECOMMEND_PROGRESS_STAGES = [
	'searchingRoutes',
	'routesFound',
	'timingRoutes',
	'aiPicking'
] as const;

export type RecommendProgressStage = (typeof RECOMMEND_PROGRESS_STAGES)[number];

export function isRecommendProgressStage(value: string): value is RecommendProgressStage {
	return (RECOMMEND_PROGRESS_STAGES as readonly string[]).includes(value);
}
