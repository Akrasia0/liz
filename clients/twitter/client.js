const { TwitterBase } = require("./base");
const { buildConversationThread, sendThreadedTweet } = require("./utils");
const axios = require("axios");
const { storeTweetIfNotExists } = require("../../dist/utils/memory");
require("dotenv").config();

const PORT = process.env.SERVER_PORT;
class TwitterClient extends TwitterBase {
	constructor(agent, config) {
		super(agent, config);
		this.postInterval = null;
		this.checkInterval = null;
		this.dryRun = config.dryRun;
	}

	async start() {
		await this.init();

		if (this.config.postIntervalHours > 0) {
			const intervalMs = this.config.postIntervalHours * 60 * 60 * 1000;
			this.postInterval = setInterval(() => this.generateAndPost(), intervalMs);
			console.log(
				`Posting loop started. Will post every ${this.config.postIntervalHours} hours`
			);
		}

		this.checkInterval = setInterval(
			() => this.checkInteractions(),
			60 * 1000 * this.config.pollingInterval
		);
		console.log("Twitter client started. Monitoring for interactions.");
	}

	async stop() {
		if (this.postInterval) {
			clearInterval(this.postInterval);
			this.postInterval = null;
		}
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		console.log("Twitter client stopped");
	}

	async generateAndPost() {
		try {
			console.log("Requesting new tweet content from the server...");

			const responseText = await this.fetchTweetContent({
				agentId: this.agent.getAgentId(),
				userId: "twitter_client",
				roomId: "twitter",
				text: "<SYSTEM> Generate a new tweet to post on your timeline </SYSTEM>",
				type: "text",
			});

			console.log("Server responded with tweet text:", responseText);
			if (this.dryRun) return;
			const tweets = await sendThreadedTweet(this, responseText);

			if (tweets.length > 0) {
				console.log("Posted tweet:", tweets.map((t) => t.text).join("\n"));

				// Store each tweet in the thread
				for (const tweet of tweets) {
					await storeTweetIfNotExists({
						id: tweet.id,
						text: tweet.text,
						userId: this.config.username,
						username: this.config.username,
						conversationId: tweet.conversationId,
						permanentUrl: tweet.permanentUrl,
						imageUrls: tweet.imageUrls,
					});
				}
			}

			return tweets;
		} catch (error) {
			console.error("Error generating/posting tweet:", error);
			return [];
		}
	}

	async checkInteractions() {
		try {
			const mentions = await this.getMentions();
			for (const mention of mentions) {
				if (this.lastCheckedTweetId && mention.id <= this.lastCheckedTweetId) {
					continue;
				}
				await this.handleMention(mention);
				this.lastCheckedTweetId = mention.id;
			}
		} catch (error) {
			console.error("Error checking interactions:", error);
		}
	}

	async handleMention(tweet) {
		try {
			const tweetStored = await storeTweetIfNotExists({
				id: tweet.id,
				text: tweet.text,
				userId: tweet.userId,
				username: tweet.username,
				conversationId: tweet.conversationId,
				inReplyToId: tweet.inReplyToStatusId,
				permanentUrl: tweet.permanentUrl,
				imageUrls: tweet.imageUrls,
			});

			if (!tweetStored) {
				console.log("Tweet already processed, skipping:", tweet.id);
				return [];
			}
			console.log(
				"Handling mention:",
				`@${tweet.username} ${tweet.text} IMAGES: ${tweet.imageUrls?.join(" ")}`
			);

			const roomId = tweet.conversationId || "twitter";
			const promptText = `@${tweet.username}:\n${tweet.text}`;

			const responseText = await this.fetchTweetContent({
				agentId: this.agent.getAgentId(),
				userId: `tw_user_${tweet.userId}`,
				roomId,
				text: promptText,
				imageUrls: tweet.imageUrls,
				type: tweet.imageUrls.length ? "text_and_image" : "text",
			});
			console.log(responseText);
			if (this.dryRun) return;

			const tweets = await sendThreadedTweet(this, responseText, tweet.id);

			if (tweets.length > 0) {
				console.log(
					"Replied to mention:",
					tweets.map((t) => t.text).join("\n")
				);
				for (const replyTweet of tweets) {
					await storeTweetIfNotExists({
						id: replyTweet.id,
						text: replyTweet.text,
						userId: this.config.username,
						username: this.config.username,
						conversationId: tweet.conversationId,
						inReplyToId: tweet.id,
						permanentUrl: replyTweet.permanentUrl,
						imageUrls: replyTweet.imageUrls,
					});
				}
			}

			return tweets;
		} catch (error) {
			console.error("Error handling mention:", error);
			return [];
		}
	}

	async fetchTweetContent(payload) {
		const url = `http://localhost:${PORT}/agent/input`;
		const body = {
			input: {
				agentId: payload.agentId,
				userId: payload.userId,
				roomId: payload.roomId,
				text: payload.text,
				type: payload.type,
				imageUrls: payload.imageUrls,
			},
		};

		try {
			const response = await axios.post(url, body, {
				headers: { "Content-Type": "application/json" },
			});

			const data = response.data;

			if (typeof data === "string") {
				return data;
			} else if (data.error) {
				throw new Error(`Server error: ${data.error}`);
			} else {
				return JSON.stringify(data);
			}
		} catch (error) {
			throw new Error(`Failed to fetch tweet content: ${error.message}`);
		}
	}

	async like(tweetId) {
		return this.likeTweet(tweetId);
	}
}

module.exports = { TwitterClient };
