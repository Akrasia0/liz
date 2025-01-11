import { LLMUtils } from "../utils/llm";
import { AgentRequest, AgentResponse, LLMSize } from "../types";
import { createTwitterMemory } from "../utils/memory";

const llmUtils = new LLMUtils();

export const handleTweetGeneration = async (
	context: string,
	req: AgentRequest,
	res: AgentResponse
) => {
	const tweet = await llmUtils.getTextFromLLM(
		`${context}\n\n
       <SYSTEM> Look at the previous twitter context then generate a original and engaging tweet that fits in with your character and previous twitter history. ONLY output the tweet, no reflection on it. No "Tweet: ". Just the text of the tweet. The text you output will be posted directly to twitter.</SYSTEM>`,
		"anthropic/claude-3.5-sonnet"
	);

	const message = `Tweeted: ${tweet}`;

	await createTwitterMemory(
		req.input.userId,
		req.input.agentId,
		req.input.roomId,
		message
	);
	await res.send(tweet);
};
