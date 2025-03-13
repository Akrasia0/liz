import { AgentMiddleware, Route } from "../types";
import { LLMUtils } from "../utils/llm";
import { z } from "zod";
import { LLMSize } from "../types";

// Constants
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Schema for route selection response from LLM
 */
const routeSchema = z.object({
	selectedRoute: z.string(),
	confidence: z.number().min(0).max(1),
	reasoning: z.string(),
});

/**
 * Router middleware that uses LLM to determine the appropriate route handler
 * based on the incoming request and available routes
 */
export const router: AgentMiddleware = async (req, res, next) => {
	try {
		// Initialize LLM utilities and get available routes
		const llmUtils = new LLMUtils();
		const routes = req.agent.getRoutes();

		// Format route descriptions for the LLM prompt
		const routeDescriptions = routes
			.map((route: Route) => `"${route.name}": ${route.description}`)
			.join("\n");

		const prompt = `
<CONTEXT>
${req.context}
</CONTEXT>

<SYSTEM>
You are functioning as a request router for an AI agent with the following system prompt:

${req.agent.getSystemPrompt()}

Your task is to analyze incoming messages and route them to the most appropriate handler based on the available routes below. Consider the agent's purpose and capabilities when making this decision.

Available Routes:
${routeDescriptions}

Based on the agent's system description and the available routes, select the most appropriate route to handle this interaction.

Respond with a JSON object containing:
- selectedRoute: The name of the selected route
- confidence: A number between 0 and 1 indicating confidence in the selection
- reasoning: A brief explanation of why this route was selected
</SYSTEM>
`.trim();

		const routeDecision = await llmUtils.getObjectFromLLM(
			prompt,
			routeSchema,
			LLMSize.LARGE
		);

		const handler = routes.find((r) => r.name === routeDecision.selectedRoute);
		if (!handler) {
			return res.error(
				new Error(`No handler for route: ${routeDecision.selectedRoute}`)
			);
		}

		// Check if confidence level meets threshold
		if (routeDecision.confidence < CONFIDENCE_THRESHOLD) {
			console.warn(
				`Low confidence (${routeDecision.confidence}) for route: ${routeDecision.selectedRoute}`
			);
			console.warn(`Reasoning: ${routeDecision.reasoning}`);
		}

		// Execute the selected route handler
		try {
			// Call the handler with context and request/response objects
			await handler.handler(req.context || "", req, res);
			await next();
		} catch (error) {
			// Handle errors from the route handler
			await res.error(
				new Error(
					`Route handler error (${routeDecision.selectedRoute}): ${
						(error as Error).message
					}`
				)
			);
		}
	} catch (error) {
		await res.error(new Error(`Router error: ${(error as Error).message}`));
	}
};
