import { handleConversation } from "./conversation";
import { handleTweetGeneration } from "./tweet";

export const routes = [
	{
		name: "conversation",
		description:
			"Call if the user is just conversing or if none of the other routes apply",
		handler: handleConversation,
	},
	{
		name: "create_new_tweet",
		description:
			"Only call if the message is the following: <SYSTEM> Generate a new tweet to post on your timeline </SYSTEM>",
		handler: handleTweetGeneration,
	},
];
