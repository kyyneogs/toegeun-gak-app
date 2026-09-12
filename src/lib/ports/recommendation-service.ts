import type { RecommendationInput, RecommendationResult } from '$lib/domain/recommendation/types';
import type { RecommendProgressStage } from '$lib/domain/recommendation/progress';

export interface RecommendOptions {
	onProgress?: (stage: RecommendProgressStage) => void;
	signal?: AbortSignal;
}

export interface RecommendationService {
	recommend(input: RecommendationInput, options?: RecommendOptions): Promise<RecommendationResult>;
}
