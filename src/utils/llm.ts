import OpenAI from "openai";
import axios from "axios";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMSize } from "../types";
import { ChatCompletionContentPartImage } from "openai/resources/chat/completions";

interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

const booleanSchema = z.object({
	result: z.boolean(),
	explanation: z.string(),
});

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
		const response = await axios.post(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				model,
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
			},
			{
				headers: {
					Authorization: `Bearer ${this.openrouterApiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
				},
			}
		);

		if (!response.data?.choices?.[0]?.message?.content) {
			throw new Error("Invalid response format from OpenRouter");
		}

		return response.data.choices[0].message.content;
	}

	async getObjectFromLLMWithImages<T>(
		prompt: string,
		schema: z.ZodSchema<T>,
		imageUrls: string[],
		size: LLMSize
	): Promise<T> {
		const base64Images = await convertUrlsToBase64(imageUrls);
		if (base64Images.length === 0) {
			throw new Error("Failed to process images");
		}

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
						...base64Images.map(
							(image): ChatCompletionContentPartImage => ({
								type: "image_url",
								image_url: {
									url: `data:${image.contentType};base64,${image.base64}`,
								},
							})
						),
					],
				},
			],
			response_format: zodResponseFormat(schema, "customSchema"),
		});

		if (!response.choices[0]?.message?.content) {
			throw new Error("Invalid response format from OpenAI");
		}

		return schema.parse(JSON.parse(response.choices[0].message.content));
	}

	async getBooleanFromLLMWithImages(
		prompt: string,
		imageUrls: string[],
		size: LLMSize
	): Promise<boolean> {
		const base64Images = await convertUrlsToBase64(imageUrls);
		if (base64Images.length === 0) {
			throw new Error("Failed to process images");
		}

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
						...base64Images.map(
							(image): ChatCompletionContentPartImage => ({
								type: "image_url",
								image_url: {
									url: `data:${image.contentType};base64,${image.base64}`,
								},
							})
						),
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

	async getTextWithImageFromLLM(
		prompt: string,
		imageUrls: string[],
		model: string
	): Promise<string> {
		const base64Images = await convertUrlsToBase64(imageUrls);
		if (base64Images.length === 0) {
			throw new Error("Failed to process images");
		}

		try {
			const response = await axios.post(
				"https://openrouter.ai/api/v1/chat/completions",
				{
					model,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: prompt,
								},
								...base64Images.map(
									(image): ChatCompletionContentPartImage => ({
										type: "image_url",
										image_url: {
											url: `data:${image.contentType};base64,${image.base64}`,
										},
									})
								),
							],
						},
					],
					max_tokens: 1000,
				},
				{
					headers: {
						Authorization: `Bearer ${this.openrouterApiKey}`,
						"Content-Type": "application/json",
						"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
					},
				}
			);

			if (!response.data?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from OpenRouter");
			}

			return response.data.choices[0].message.content;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`OpenRouter API error: ${error}`);
			}
			throw error;
		}
	}

	async getImageDescriptions(
		imageUrls: string[],
		model: string = "openai/gpt-4o"
	): Promise<string> {
		if (!imageUrls || imageUrls.length === 0)
			throw new Error("No images provided");

		const base64Images = await convertUrlsToBase64(imageUrls);
		if (base64Images.length === 0) {
			throw new Error("Failed to process images");
		}

		try {
			const response = await axios.post(
				"https://openrouter.ai/api/v1/chat/completions",
				{
					model,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: "Describe the image(s) in a couple of concise sentences that capture the most important elemetns of the image:",
								},
								...base64Images.map((image) => ({
									type: "image_url",
									image_url: {
										url: `data:${image.contentType};base64,${image.base64}`,
									},
								})),
							],
						},
					],
					max_tokens: 1000,
				},
				{
					headers: {
						Authorization: `Bearer ${this.openrouterApiKey}`,
						"Content-Type": "application/json",
						"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
					},
				}
			);

			if (!response.data?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response format from OpenRouter");
			}

			return response.data.choices[0].message.content;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(
					`OpenRouter API error: ${error.response?.statusText || error.message}`
				);
			}
			throw error;
		}
	}
}

interface Base64Image {
	base64: string;
	contentType: string;
}

async function fetchImageAsBase64(url: string): Promise<Base64Image | null> {
	try {
		const response = await axios.get(url, {
			responseType: "arraybuffer",
		});
		const contentType = response.headers["content-type"];
		if (
			!contentType ||
			!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
				contentType
			)
		) {
			console.warn(`Unsupported image type: ${contentType}, url: ${url}`);
			return null;
		}
		return {
			base64: Buffer.from(response.data, "binary").toString("base64"),
			contentType,
		};
	} catch (error) {
		console.error("Error fetching image:", error);
		return null;
	}
}

async function convertUrlsToBase64(
	imageUrls: string[]
): Promise<Base64Image[]> {
	const base64Images: Base64Image[] = [];
	for (const url of imageUrls) {
		const result = await fetchImageAsBase64(url);
		if (result) {
			base64Images.push(result);
		}
	}
	return base64Images;
}
