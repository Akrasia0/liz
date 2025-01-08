import { LLMUtils } from "../utils/llm";
import { prisma } from "../utils/db";
import { AgentRequest, AgentResponse } from "../types";

export const handleConversation = async (
	context: string,
	req: AgentRequest,
	res: AgentResponse
) => {
	const llmUtils = new LLMUtils();

	const response = await llmUtils.getTextFromLLM(
		context,
		"anthropic/claude-3.5-sonnet"
	);

	// Store the response as a memory
	await prisma.memory.create({
		data: {
			userId: req.input.userId,
			agentId: req.input.agentId,
			roomId: req.input.roomId,
			type: "agent",
			generator: "llm",
			content: JSON.stringify({ text: response }),
		},
	});

	await res.send(response);
};
