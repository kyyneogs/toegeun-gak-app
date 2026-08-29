import type { RecommendationInput, RecommendationResult } from '$lib/domain/recommendation/types';

export interface RecommendationService {
	recommend(input: RecommendationInput): Promise<RecommendationResult>;
}
