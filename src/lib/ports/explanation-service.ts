import type {
	ExplanationContext,
	RecommendationExplanation,
	RecommendationResult
} from '$lib/domain/recommendation/types';

export interface ExplanationService {
	explain(
		result: RecommendationResult,
		context: ExplanationContext
	): Promise<RecommendationExplanation>;
}
