import { AgentMiddleware, Memory } from "../types";

function formatMemories(memories: Memory[] | undefined): string {
	if (!memories || memories.length === 0) {
		return "No previous conversation history.";
	}

	return memories
		.reverse()
		.map((memory) => {
			try {
				const content = JSON.parse(memory.content);

				if (memory.type === "user") {
					return `[${memory.createdAt.toISOString()}] User ${memory.userId}: ${
						content.text
					}`;
				} else if (memory.type === "agent") {
					return `[${memory.createdAt.toISOString()}] Agent ${
						memory.agentId
					}: ${content}`;
				}
			} catch (e) {
				return `[${memory.createdAt.toISOString()}] Error parsing memory: ${
					memory.content
				}`;
			}
		})
		.join("\n\n"); // Add extra line between messages for better readability
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
		req.context = `
Previous Conversation:
${formatMemories(req.memories)}

Agent Context:
${req.agent.getAgentContext()}

${formatInput(req.input)}
`.trim();

		await next();
	} catch (error) {
		await res.error(
			new Error(`Failed to wrap context: ${(error as Error).message}`)
		);
	}
};
