const { EventEmitter } = require("events");
const { Scraper } = require("agent-twitter-client");

// Twitter client configuration

/**
 * @typedef {Object} Tweet
 * @property {string} id - Tweet ID
 * @property {string} name - Author's display name
 * @property {string} username - Author's username
 * @property {string} text - Tweet content
 * @property {number} timestamp - Unix timestamp in seconds
 * @property {string} userId - Author's user ID
 * @property {string} conversationId - Conversation thread ID
 * @property {string} inReplyToStatusId - ID of parent tweet if reply
 * @property {string} permanentUrl - Permanent URL to tweet
 * @property {string[]} [imageUrls] - Optional array of image URLs
 * @property {Object} [metrics] - Optional engagement metrics
 */

class RequestQueue {
	constructor() {
		this.queue = [];
		this.processing = false;
	}

	/**
	 * Adds a request to the queue
	 * @param {Function} request - Async function to execute
	 * @returns {Promise<any>} Result of the request
	 */
	async add(request) {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await request();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			this.processQueue();
		});
	}

	/**
	 * Processes queued requests with rate limiting
	 * @returns {Promise<void>}
	 */
	async processQueue() {
		// Skip if already processing or queue is empty
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;
		while (this.queue.length > 0) {
			const request = this.queue.shift();
			try {
				await request();
				// Standard rate limiting delay
				await this.delay(1000);
			} catch (error) {
				console.error("Error processing request:", error);
				// Increased backoff on error
				await this.delay(2000);
			}
		}
		this.processing = false;
	}

	/**
	 * Utility delay function
	 * @param {number} ms - Milliseconds to delay
	 * @returns {Promise<void>}
	 */
	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

class TwitterBase extends EventEmitter {
	/**
	 * @param {Object} agent - Agent instance
	 * @param {Object} config - Twitter configuration
	 */
	constructor(agent, config) {
		super();
		this.agent = agent;
		this.config = config;
		this.twitterClient = new Scraper();
		this.requestQueue = new RequestQueue();
		this.lastCheckedTweetId = null;
	}

	/**
	 * Initialize the Twitter client and login
	 * @returns {Promise<void>}
	 * @throws {Error} If login fails after maximum retries
	 */
	async init() {
		console.log("Initializing Twitter client...");
		let retries = this.config.retryLimit;

		while (retries > 0) {
			try {
				if (await this.twitterClient.isLoggedIn()) {
					console.log("Already logged in");
					break;
				}

				await this.twitterClient.login(
					this.config.username,
					this.config.password,
					this.config.email,
					this.config.twoFactorSecret
				);

				if (await this.twitterClient.isLoggedIn()) {
					console.log("Successfully logged in");
					break;
				}
			} catch (error) {
				console.error(`Login attempt failed: ${error.message}`);
			}

			retries--;
			console.log(`Retrying... (${retries} attempts left)`);
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		if (retries === 0) {
			throw new Error("Failed to login after maximum retries");
		}
	}

	/**
	 * Fetch a single tweet by ID
	 * @param {string} tweetId - ID of tweet to fetch
	 * @returns {Promise<Tweet|null>} Tweet object or null if not found
	 */
	async getTweet(tweetId) {
		try {
			const tweet = await this.requestQueue.add(() =>
				this.twitterClient.getTweet(tweetId)
			);

			// Get image URLs if present
			const imageUrls = [];
			if (tweet.media) {
				for (const mediaItem of tweet.media) {
					if (mediaItem.type === "photo") {
						imageUrls.push(mediaItem.url);
					}
				}
			}

			return {
				id: tweet.id,
				name: tweet.name,
				username: tweet.username,
				text: tweet.text,
				timestamp: tweet.timestamp,
				userId: tweet.userId,
				conversationId: tweet.conversationId,
				inReplyToStatusId: tweet.inReplyToStatusId,
				permanentUrl: tweet.permanentUrl,
				imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
			};
		} catch (error) {
			console.error("Error fetching tweet:", error);
			return null;
		}
	}

	/**
	 * Fetch home timeline tweets
	 * @param {number} [count=20] - Number of tweets to fetch
	 * @returns {Promise<Tweet[]>} Array of tweets
	 */
	async fetchHomeTimeline(count = 20) {
		try {
			const timeline = await this.requestQueue.add(() =>
				this.twitterClient.fetchHomeTimeline(count)
			);

			return timeline.map((tweet) => ({
				id: tweet.rest_id,
				name: tweet.core?.user_results?.result?.legacy?.name,
				username: tweet.core?.user_results?.result?.legacy?.screen_name,
				text: tweet.legacy?.full_text,
				timestamp: new Date(tweet.legacy?.created_at).getTime() / 1000,
				userId: tweet.legacy?.user_id_str,
				conversationId: tweet.legacy?.conversation_id_str,
				inReplyToStatusId: tweet.legacy?.in_reply_to_status_id_str,
				permanentUrl: `https://twitter.com/${tweet.core?.user_results?.result?.legacy?.screen_name}/status/${tweet.rest_id}`,
			}));
		} catch (error) {
			console.error("Error fetching timeline:", error);
			return [];
		}
	}

	/**
	 * Send a new tweet
	 * @param {string} text - Tweet content
	 * @param {string} [replyToId] - Optional ID of tweet to reply to
	 * @returns {Promise<Tweet|null>} Posted tweet or null if failed
	 */
	async sendTweet(text, replyToId) {
		try {
			const result = await this.requestQueue.add(() =>
				this.twitterClient.sendTweet(text, replyToId)
			);

			const response = await result.json();
			if (!response?.data?.create_tweet?.tweet_results?.result) {
				throw new Error("Invalid response from Twitter");
			}

			const tweet = response.data.create_tweet.tweet_results.result;
			return {
				id: tweet.rest_id,
				text: tweet.legacy.full_text,
				timestamp: new Date(tweet.legacy.created_at).getTime() / 1000,
				userId: tweet.legacy.user_id_str,
				conversationId: tweet.legacy.conversation_id_str,
				permanentUrl: `https://twitter.com/${this.config.username}/status/${tweet.rest_id}`,
			};
		} catch (error) {
			console.error("Error sending tweet:", error);
			return null;
		}
	}

	/**
	 * Like a tweet
	 * @param {string} tweetId - ID of tweet to like
	 * @returns {Promise<boolean>} Success status
	 */
	async likeTweet(tweetId) {
		try {
			await this.requestQueue.add(() => this.twitterClient.likeTweet(tweetId));
			return true;
		} catch (error) {
			console.error("Error liking tweet:", error);
			return false;
		}
	}

	/**
	 * Search for tweets
	 * @param {string} query - Search query
	 * @param {number} [count=20] - Number of tweets to fetch
	 * @returns {Promise<Tweet[]>} Array of matching tweets
	 */
	async searchTweets(query, count = 20) {
		try {
			const results = await this.requestQueue.add(() =>
				this.twitterClient.fetchSearchTweets(query, count, "Latest")
			);
			return results.tweets.map((tweet) => {
				const imageUrls = [];
				for (const photoItem of tweet.photos || []) {
					imageUrls.push(photoItem.url);
				}

				let cleanedText = tweet.text;
				if (imageUrls.length > 0) {
					const urlPattern = /https:\/\/t\.co\/\w+/g;
					cleanedText = cleanedText.replace(urlPattern, "<IMAGE>");
				}

				return {
					id: tweet.id,
					name: tweet.name,
					username: tweet.username,
					text: cleanedText,
					timestamp: tweet.timestamp,
					userId: tweet.userId,
					conversationId: tweet.conversationId,
					inReplyToStatusId: tweet.inReplyToStatusId,
					permanentUrl: tweet.permanentUrl,
					imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
				};
			});
		} catch (error) {
			console.error("Error searching tweets:", error);
			return [];
		}
	}

	/**
	 * Get mentions of the authenticated user
	 * @param {number} [count=5] - Number of mentions to fetch
	 * @returns {Promise<Tweet[]>} Array of mentions
	 */
	async getMentions(count = 10) {
		return this.searchTweets(`@${this.config.username}`, count);
	}
}

module.exports = { TwitterBase };
