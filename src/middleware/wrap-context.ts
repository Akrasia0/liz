import { AgentMiddleware, Memory } from "../types";

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
				}`;
			} else if (memory.generator === "llm") {
				return `[${memory.createdAt.toISOString()}] You: ${content.text}`;
			}
		})
		.filter(Boolean)
		.join("\n\n");
}

function formatInput(input: any): string {
	const { type, text, imageUrl, audioUrl, videoUrl } = input;
	const parts = [];

	if (text) parts.push(`Text: ${text}`);
	if (imageUrl) parts.push(`Image: ${imageUrl}`);
	if (audioUrl) parts.push(`Audio: ${audioUrl}`);
	if (videoUrl) parts.push(`Video: ${videoUrl}`);

	return `Current Input (${type}):\n${parts.join("\n")}`;
}

export const wrapContext: AgentMiddleware = async (req, res, next) => {
	try {
		const memories = formatMemories(req.memories);
		const agentContext = req.agent.getAgentContext();
		const currentInput = formatInput(req.input);

		req.context = `
<PREVIOUS_CONVERSATION>
${memories}
</PREVIOUS_CONVERSATION>

<AGENT_CONTEXT>
${agentContext}
</AGENT_CONTEXT>

<CURRENT_USER_INPUT>
${currentInput}
<CURRENT_USER_INPUT>
`.trim();

		await next();
	} catch (error) {
		await res.error(
			new Error(`Failed to wrap context: ${(error as Error).message}`)
		);
	}
};
