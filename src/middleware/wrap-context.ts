import { AgentMiddleware, Memory } from "../types";
import { LLMUtils } from "../utils/llm";
const llmUtils = new LLMUtils();

function formatMemories(memories: Memory[] | undefined): string {
	if (!memories || memories.length === 0) {
		return "No previous conversation history.";
	}

	return memories
		.reverse()
		.map((memory) => {
			const content = memory.content;
			if (memory.generator === "external") {
				return `[${memory.createdAt.toISOString()}]User ${memory.userId}: ${
					content.text
				} ${
					content.imageDescriptions
						? `Description of attached images:\n${content.imageDescriptions}`
						: ""
				}`;
			} else if (memory.generator === "llm") {
				return `[${memory.createdAt.toISOString()}] You: ${content.text}
				${
					content.imageDescriptions
						? `Description of attached images:\n${content.imageDescriptions}`
						: ""
				}`;
			}
		})
		.filter(Boolean)
		.join("\n\n");
}

export const wrapContext: AgentMiddleware = async (req, res, next) => {
	try {
		const memories = formatMemories(req.memories);
		const agentContext = req.agent.getAgentContext();
		const currentInput = req.input.text;
		let imageDescriptions: string | undefined;
		if (req.input.imageUrls && req.input.imageUrls.length > 0) {
			try {
				imageDescriptions = await llmUtils.getImageDescriptions(
					req.input.imageUrls
				);
			} catch (error) {
				console.warn("Failed to get image descriptions:", error);
			}
		}
		req.input.imageDescriptions = imageDescriptions
			? `Description of attached images:\n${imageDescriptions}`
			: undefined;
		req.context = `
<PREVIOUS_CONVERSATION>
${memories}
</PREVIOUS_CONVERSATION>

<AGENT_CONTEXT>
${agentContext}
</AGENT_CONTEXT>

<CURRENT_USER_INPUT>
 TEXT: ${currentInput}
${imageDescriptions ? `\nIMAGES:\n${imageDescriptions}` : ""}
</CURRENT_USER_INPUT>
`.trim();

		await next();
	} catch (error) {
		await res.error(
			new Error(`Failed to wrap context: ${(error as Error).message}`)
		);
	}
};
