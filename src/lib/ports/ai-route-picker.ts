import type { AiPickChoice, AiPickContext } from '$lib/domain/recommendation/ai-candidates';

export interface AiRoutePicker {
	pick(context: AiPickContext): Promise<AiPickChoice>;
}
