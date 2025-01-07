const { TwitterBase } = require("./base");
const { buildConversationThread, sendThreadedTweet } = require("./utils");

class TwitterClient extends TwitterBase {
    /**
     * @param {Object} agent - Agent instance
     * @param {Object} config - Twitter configuration
     */
    constructor(agent, config) {
        super(agent, config);
        this.postInterval = null;
        this.checkInterval = null;
    }

    /**
     * Start the Twitter client, including posting and monitoring loops
     * @returns {Promise<void>}
     */
    async start() {
        await this.init();

        // Start the posting loop if enabled
        if (this.config.postIntervalHours > 0) {
            const intervalMs = this.config.postIntervalHours * 60 * 60 * 1000;
            this.postInterval = setInterval(() => this.generateAndPost(), intervalMs);
            console.log(
                `Posting loop started. Will post every ${this.config.postIntervalHours} hours`
            );
        }

        // Check for mentions every 5 minutes
        this.checkInterval = setInterval(
            () => this.checkInteractions(),
            5 * 60 * 1000
        );
        console.log("Twitter client started. Monitoring for interactions.");
    }

    /**
     * Stop the Twitter client and clear all intervals
     * @returns {Promise<void>}
     */
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

    /**
     * Generate and post a new tweet using the agent
     * @returns {Promise<Array<{
     *   id: string,
     *   text: string,
     *   timestamp: number,
     *   userId: string,
     *   conversationId: string,
     *   permanentUrl: string
     * }>>} Array of posted tweets if successful
     */
    async generateAndPost() {
        try {
            console.log("Generating new tweet...");
            const prompt = `As ${this.agent.getId()}, compose a tweet about a topic in your expertise.
                        Keep it under 280 characters. Write only the tweet text.`;

            const response = await this.agent.generateResponse(prompt);
            const tweets = await sendThreadedTweet(this, response);

            if (tweets.length > 0) {
                console.log("Posted tweet:", tweets.map((t) => t.text).join("\n"));
            }
            
            return tweets;
        } catch (error) {
            console.error("Error generating/posting tweet:", error);
            return [];
        }
    }

    /**
     * Check for and handle new mentions
     * @returns {Promise<void>}
     */
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

    /**
     * Handle a single mention by generating and posting a reply
     * @param {Object} tweet - Tweet object representing the mention
     * @param {string} tweet.id - Tweet ID
     * @param {string} tweet.username - Author's username
     * @param {string} tweet.text - Tweet content
     * @returns {Promise<Array<{
     *   id: string,
     *   text: string,
     *   timestamp: number,
     *   userId: string,
     *   conversationId: string,
     *   permanentUrl: string
     * }>>} Array of reply tweets if successful
     */
    async handleMention(tweet) {
        try {
            const thread = await buildConversationThread(tweet, this);
            const conversation = thread
                .map((t) => `@${t.username}: ${t.text}`)
                .join("\n");

            const prompt = `You are ${this.agent.getId()}. Generate a reply to this conversation:

Conversation thread:
${conversation}

Latest tweet from @${tweet.username}:
${tweet.text}

Write only your reply (max 280 characters):`;

            const response = await this.agent.generateResponse(prompt);
            const tweets = await sendThreadedTweet(this, response, tweet.id);

            if (tweets.length > 0) {
                console.log(
                    "Replied to mention:",
                    tweets.map((t) => t.text).join("\n")
                );
            }
            
            return tweets;
        } catch (error) {
            console.error("Error handling mention:", error);
            return [];
        }
    }

    /**
     * Get recent tweets from the home timeline
     * @param {number} [count=20] - Number of tweets to fetch
     * @returns {Promise<Array<{
     *   id: string,
     *   name: string,
     *   username: string,
     *   text: string,
     *   timestamp: number,
     *   userId: string,
     *   conversationId: string,
     *   inReplyToStatusId: string,
     *   permanentUrl: string
     * }>>} Array of timeline tweets
     */
    async getTimeline(count = 20) {
        return this.fetchHomeTimeline(count);
    }

    /**
     * Reply to a specific tweet
     * @param {string} tweetId - ID of tweet to reply to
     * @param {string} [content] - Optional reply content. If not provided, will be generated
     * @returns {Promise<Array<{
     *   id: string,
     *   text: string,
     *   timestamp: number,
     *   userId: string,
     *   conversationId: string,
     *   permanentUrl: string
     * }>>} Array of reply tweets if successful
     */
    async replyToTweet(tweetId, content) {
        try {
            const tweet = await this.getTweet(tweetId);
            if (!tweet) {
                throw new Error("Tweet not found");
            }

            const replyContent = content || (await this.generateReplyToTweet(tweet));
            return await sendThreadedTweet(this, replyContent, tweetId);
        } catch (error) {
            console.error("Error replying to tweet:", error);
            return [];
        }
    }

    /**
     * Generate a reply to a specific tweet using the agent
     * @param {Object} tweet - Tweet to reply to
     * @param {string} tweet.username - Author's username
     * @param {string} tweet.text - Tweet content
     * @returns {Promise<string>} Generated reply content
     */
    async generateReplyToTweet(tweet) {
        const thread = await buildConversationThread(tweet, this);
        const prompt = `You are ${this.agent.getId()}. Generate a reply to this tweet:
        
Tweet from @${tweet.username}: ${tweet.text}

Context:
${thread.map((t) => `@${t.username}: ${t.text}`).join("\n")}

Write only your reply (max 280 characters):`;

        return this.agent.generateResponse(prompt);
    }

    /**
     * Like a tweet
     * @param {string} tweetId - ID of tweet to like
     * @returns {Promise<boolean>} Success status
     */
    async like(tweetId) {
        return this.likeTweet(tweetId);
    }
}

module.exports = { TwitterClient };