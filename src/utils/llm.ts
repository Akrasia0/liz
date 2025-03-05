/**
 * LLM Utilities Module
 *
 * This module provides a unified interface for interacting with various LLM providers,
 * including OpenAI and OpenRouter. It supports text generation, structured output,
 * boolean responses, and image analysis capabilities.
 */

import OpenAI from "openai";
import axios from "axios";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMSize } from "../types";
import { ChatCompletionContentPartImage } from "openai/resources/chat/completions";

/**
 * Interface for OpenRouter API responses
 */
interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * Zod schema for boolean responses with explanations
 */
const booleanSchema = z.object({
	result: z.boolean(),
	explanation: z.string(),
});

/**
 * LLMUtils class provides methods for interacting with language models
 *
 * Note: We use JSON responses only from OpenAI because the other SDKs are unreliable.
 */
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

	/**
	 * Gets a boolean response from the LLM with explanation
	 *
	 * @param prompt The prompt to send to the LLM
	 * @param size The size of the model to use (LARGE or SMALL)
	 * @returns A boolean result based on the LLM's analysis
	 */
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

	/**
	 * Gets a structured object response from the LLM based on a Zod schema
	 *
	 * @param prompt The prompt to send to the LLM
	 * @param schema The Zod schema that defines the expected response structure
	 * @param size The size of the model to use (LARGE or SMALL)
	 * @returns A typed object matching the provided schema
	 */
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

	/**
	 * Gets a free-form text response from the LLM via OpenRouter
	 *
	 * @param prompt The prompt to send to the LLM
	 * @param model The model identifier (e.g., "anthropic/claude-3.5-sonnet")
	 * @returns The generated text response
	 */
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

	/**
	 * Streams the LLM response in real-time using SSE from OpenRouter.
	 *
	 * @param prompt The user prompt string.
	 * @param model The model to use (e.g., "gpt-4o" or "gpt-4o-mini").
	 * @param onToken Callback that receives each partial token as it arrives.
	 * @returns A Promise that resolves once the stream is completed.
	 */
	async getTextFromLLMStream(
		prompt: string,
		model: string,
		onToken: (token: string) => void
	): Promise<void> {
		try {
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
					// Enable streaming
					stream: true,
				},
				{
					headers: {
						Authorization: `Bearer ${this.openrouterApiKey}`,
						"Content-Type": "application/json",
						"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
					},
					// Needed to parse the SSE stream
					responseType: "stream",
				}
			);

			return new Promise<void>((resolve, reject) => {
				// Listen for data events on the response stream
				response.data.on("data", (chunk: Buffer) => {
					parseSSEChunk(chunk, onToken);
				});

				// The stream has ended
				response.data.on("end", () => {
					resolve();
				});

				// Handle errors
				response.data.on("error", (error: unknown) => {
					reject(error);
				});
			});
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`OpenRouter API error: ${error.message}`);
			}
			throw error;
		}
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

	/**
	 * Streams the LLM response in real-time using SSE from OpenRouter,
	 * including base64-encoded images in the request.
	 *
	 * @param prompt The user prompt string.
	 * @param imageUrls Array of URLs for the images you want to attach.
	 * @param model The model to use (e.g., "gpt-4o" or "gpt-4o-mini").
	 * @param onToken Callback that receives each partial token as it arrives.
	 * @returns A Promise that resolves once the stream is completed.
	 */
	async getTextWithImageFromLLMStream(
		prompt: string,
		imageUrls: string[],
		model: string,
		onToken: (token: string) => void
	): Promise<void> {
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
								...base64Images.map((image) => ({
									type: "image_url",
									image_url: {
										url: `data:${image.contentType};base64,${image.base64}`,
									},
								})),
							],
						},
					],
					stream: true,
					max_tokens: 1000,
				},
				{
					headers: {
						Authorization: `Bearer ${this.openrouterApiKey}`,
						"Content-Type": "application/json",
						"HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
					},
					responseType: "stream",
				}
			);

			return new Promise<void>((resolve, reject) => {
				response.data.on("data", (chunk: Buffer) => {
					parseSSEChunk(chunk, onToken);
				});

				response.data.on("end", () => {
					resolve();
				});

				response.data.on("error", (error: unknown) => {
					reject(error);
				});
			});
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`OpenRouter API error: ${error.message}`);
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

/**
 * Parses a data stream of SSE lines from OpenRouter.
 *
 * @param chunk The chunk of data (a portion of the SSE event stream).
 * @param onToken Callback to handle each token (partial text).
 */
function parseSSEChunk(chunk: Buffer, onToken: (token: string) => void) {
	const raw = chunk.toString("utf-8");
	const lines = raw.split("\n");

	for (const line of lines) {
		if (!line || line.trim().length === 0) {
			continue;
		}
		// "data: [DONE]" indicates the end of the stream
		if (line.trim() === "data: [DONE]") {
			return; // you could handle a cleanup or a "done" signal here if needed
		}
		if (line.startsWith("data: ")) {
			// Each line after "data:" should be valid JSON, e.g.:
			// data: {"id":"...","object":"...","created":...,"choices":[...]...}
			const jsonString = line.substring("data: ".length).trim();
			try {
				const parsed = JSON.parse(jsonString);
				if (parsed.choices && parsed.choices.length > 0) {
					// The partial token usually appears in choices[0].delta.content
					const token = parsed.choices[0].delta?.content;
					if (token) {
						onToken(token);
					}
				}
			} catch (err) {
				// If some lines are not valid JSON, you can handle or ignore them
				console.error("Failed to parse SSE line:", line, err);
			}
		}
	}
}
