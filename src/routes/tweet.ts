import { LLMUtils } from "../utils/llm";
import { AgentRequest, AgentResponse, LLMSize } from "../types";
import { createTwitterMemory } from "../utils/memory";

// Initialize LLM utility for text generation
const tweetGenerator = new LLMUtils();

export const handleTweetGeneration = async (
	context: string,
	req: AgentRequest,
	res: AgentResponse
) => {
	// Generate tweet content using LLM
	const tweetContent = await tweetGenerator.getTextFromLLM(
		`${context}\n\n
       <SYSTEM> Look at the previous twitter context then generate a original and engaging tweet that fits in with your character and previous twitter history. ONLY output the tweet, no reflection on it. No "Tweet: ". Just the text of the tweet. The text you output will be posted directly to twitter.</SYSTEM>`,
		"anthropic/claude-3.5-sonnet"
	);

	const logMessage = `Tweeted: ${tweetContent}`;

	// Store the tweet in memory for future context
	await createTwitterMemory(
		req.input.userId,
		req.input.agentId,
		req.input.roomId,
		logMessage
	);

	// Send the generated tweet as response
	await res.send(tweetContent);
};
