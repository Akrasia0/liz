import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMSize } from "../types";

interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}
// Why JSON responses only from OpenAI? Because the other SDKs are unreliable.
export class LLMUtils {
	private openai: OpenAI;
	private openrouterApiKey: string;

	constructor() {
		const openaiApiKey = process.env.OPENAI_API_KEY;
		const openrouterApiKey = process.env.OPENROUTER_API_KEY;
		if (!openaiApiKey) {
			throw new Error("OPENAI_API_KEY environment variable is required");
		}
		if (!openrouterApiKey) {
			throw new Error("OPENROUTER_API_KEY environment variable is required");
		}
		this.openai = new OpenAI({ apiKey: openaiApiKey });
		this.openrouterApiKey = openrouterApiKey;
	}

	async getBooleanFromLLM(prompt: string, size: LLMSize): Promise<boolean> {
		const booleanSchema = z.object({
			result: z.boolean(),
			explanation: z.string(),
		});

		const model = size === LLMSize.LARGE ? "gpt-4o" : "gpt-4o-mini";

		const response = await this.openai.beta.chat.completions.parse({
			model,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: `${prompt}\n\nRespond with true or false. Include a brief explanation of your reasoning.`,
						},
					],
				},
			],
			response_format: zodResponseFormat(booleanSchema, "booleanSchema"),
		});

		if (!response.choices[0]?.message?.content) {
			throw new Error("Invalid response format from OpenAI");
		}

		const analysis = JSON.parse(response.choices[0].message.content);
		return analysis.result;
	}

	async getObjectFromLLM<T>(
		prompt: string,
		schema: z.ZodSchema<T>,
		size: LLMSize
	): Promise<T> {
		const model = size === LLMSize.LARGE ? "gpt-4o" : "gpt-4o-mini";

		const response = await this.openai.beta.chat.completions.parse({
			model,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: prompt,
						},
					],
				},
			],
			response_format: zodResponseFormat(schema, "customSchema"),
		});

		if (!response.choices[0]?.message?.content) {
			throw new Error("Invalid response format from OpenAI");
		}

		return JSON.parse(response.choices[0].message.content);
	}

	async getTextFromLLM(prompt: string, model: string): Promise<string> {
		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.openrouterApiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
				}),
			}
		);

		if (!response.ok) {
			throw new Error(`OpenRouter API error: ${response.statusText}`);
		}

		const data = (await response.json()) as OpenRouterResponse;

		if (!data.choices?.[0]?.message?.content) {
			throw new Error("Invalid response format from OpenRouter");
		}

		return data.choices[0].message.content;
	}
}
