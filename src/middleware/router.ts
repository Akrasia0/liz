import { AgentMiddleware } from "../types";
import { LLMUtils } from "../utils/llm";
import { z } from "zod";
import { LLMSize } from "../types";

const routeSchema = z.object({
	selectedRoute: z.string(),
	confidence: z.number(),
	reasoning: z.string(),
});

export const router: AgentMiddleware = async (req, res, next) => {
	try {
		const llmUtils = new LLMUtils();
		const routes = req.agent.getRoutes();

		// Create route descriptions for LLM
		const routeDescriptions = Array.from(routes.entries())
			.map(([name, route]) => `${name}: ${route.description}`)
			.join("\n");

		const prompt = `
You are functioning as a request router for an AI agent with the following system prompt:

${req.agent.getSystemPrompt()}

Your task is to analyze incoming messages and route them to the most appropriate handler based on the available routes below. Consider the agent's purpose and capabilities when making this decision.

Available Routes:
${routeDescriptions}

Recent Context and Current Request:
${req.context}

Based on the agent's system description and the available routes, select the most appropriate route to handle this interaction.

Respond with a JSON object containing:
- selectedRoute: The name of the selected route
- confidence: A number between 0 and 1 indicating confidence in the selection
- reasoning: A brief explanation of why this route was selected
`.trim();

		const routeDecision = await llmUtils.getObjectFromLLM(
			prompt,
			routeSchema,
			LLMSize.LARGE
		);

		const handler = routes.get(routeDecision.selectedRoute);
		if (!handler) {
			return res.error(
				new Error(`No handler for route: ${routeDecision.selectedRoute}`)
			);
		}

		if (routeDecision.confidence < 0.7) {
			console.warn(
				`Low confidence (${routeDecision.confidence}) for route: ${routeDecision.selectedRoute}`
			);
			console.warn(`Reasoning: ${routeDecision.reasoning}`);
		}

		try {
			await handler.handler(req.context || "", req, res);
			await next();
		} catch (error) {
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
