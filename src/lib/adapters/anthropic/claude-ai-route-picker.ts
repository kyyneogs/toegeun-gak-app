import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { ERROR_CODES } from '$lib/constants/errors';
import { AI_HAIKU_MODEL, AI_PICK_TIMEOUT_MS } from '$lib/constants/persist';
import { AppError, isAppError } from '$lib/domain/errors';
import {
	buildAiPickPrompt,
	type AiPickChoice,
	type AiPickContext
} from '$lib/domain/recommendation/ai-candidates';
import type { AiRoutePicker } from '$lib/ports/ai-route-picker';

const aiPickSchema = z.object({
	index: z.number().int(),
	reason: z.string().min(1)
});

type GenerateTextFn = typeof generateText;

export class ClaudeAiRoutePicker implements AiRoutePicker {
	constructor(
		private readonly apiKey: string,
		private readonly generate: GenerateTextFn = generateText
	) {}

	async pick(context: AiPickContext): Promise<AiPickChoice> {
		if (context.candidates.length === 0) {
			throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
		}

		const anthropic = createAnthropic({ apiKey: this.apiKey });
		const abort = AbortSignal.timeout(AI_PICK_TIMEOUT_MS);

		try {
			const result = await this.generate({
				model: anthropic(AI_HAIKU_MODEL),
				output: Output.object({ schema: aiPickSchema }),
				prompt: buildAiPickPrompt(context),
				abortSignal: abort
			});

			if (!result.output) {
				throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
			}

			return result.output;
		} catch (cause) {
			if (isAppError(cause) && cause.code === ERROR_CODES.AI_UNAVAILABLE) {
				throw cause;
			}

			console.error('Claude AI pick failed', cause);
			throw new AppError(ERROR_CODES.AI_UNAVAILABLE, undefined, cause);
		}
	}
}
