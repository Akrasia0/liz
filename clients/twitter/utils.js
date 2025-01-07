/**
 * Builds a thread of tweets from a given tweet by traversing up through reply chains
 * @param {Object} tweet - The tweet object to start building the thread from
 * @param {TwitterBase} client - The Twitter client instance
 * @param {number} [maxReplies=5] - Maximum number of replies to include in the thread
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
 * }>>} Array of tweets in chronological order
 */
async function buildConversationThread(tweet, client, maxReplies = 5) {
    const thread = [];
    const visited = new Set();

    async function processThread(currentTweet, depth = 0) {
        if (!currentTweet || depth >= maxReplies || visited.has(currentTweet.id)) {
            return;
        }

        visited.add(currentTweet.id);
        thread.unshift(currentTweet);

        if (currentTweet.inReplyToStatusId) {
            try {
                const parentTweet = await client.getTweet(currentTweet.inReplyToStatusId);
                if (parentTweet) {
                    await processThread(parentTweet, depth + 1);
                }
            } catch (error) {
                console.error('Error fetching parent tweet:', error);
            }
        }
    }

    await processThread(tweet);
    return thread;
}

/**
 * Splits a long text into multiple tweet-sized chunks
 * @param {string} text - The text content to split
 * @param {number} [maxLength=280] - Maximum length of each tweet
 * @returns {string[]} Array of tweet-sized text chunks
 */
function splitTweetContent(text, maxLength = 280) {
    if (text.length <= maxLength) return [text];

    const tweets = [];
    let currentTweet = '';

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
        if ((currentTweet + sentence).length <= maxLength) {
            currentTweet += sentence;
        } else {
            if (currentTweet) tweets.push(currentTweet.trim());
            
            if (sentence.length > maxLength) {
                const words = sentence.split(' ');
                currentTweet = words[0];
                
                for (let i = 1; i < words.length; i++) {
                    if ((currentTweet + ' ' + words[i]).length <= maxLength) {
                        currentTweet += ' ' + words[i];
                    } else {
                        tweets.push(currentTweet.trim());
                        currentTweet = words[i];
                    }
                }
            } else {
                currentTweet = sentence;
            }
        }
    }

    if (currentTweet) tweets.push(currentTweet.trim());
    return tweets;
}

/**
 * Sends a series of tweets as a thread
 * @param {TwitterBase} client - The Twitter client instance
 * @param {string} content - The content to be tweeted
 * @param {string} [replyToId] - Optional ID of tweet to reply to
 * @returns {Promise<Array<{
 *   id: string,
 *   text: string,
 *   timestamp: number,
 *   userId: string,
 *   conversationId: string,
 *   permanentUrl: string
 * }>>} Array of posted tweets
 */
async function sendThreadedTweet(client, content, replyToId) {
    const tweets = [];
    const parts = splitTweetContent(content);
    let lastTweetId = replyToId;

    for (const part of parts) {
        const tweet = await client.sendTweet(part, lastTweetId);
        if (tweet) {
            tweets.push(tweet);
            lastTweetId = tweet.id;
        } else {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return tweets;
}

module.exports = {
    buildConversationThread,
    splitTweetContent,
    sendThreadedTweet
};