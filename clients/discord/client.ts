import { Message, MessageOptions, MessagePayload } from "discord.js";
import { DiscordBase, DiscordConfig } from "./base";
import axios from "axios";
import { InputSource, InputType } from "../../src/types";
import { createDiscordMemory } from "../../src/utils/memory";

export class DiscordClient extends DiscordBase {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(agent: any, config: DiscordConfig) {
    super(agent, config);
    this.checkInterval = null;
  }

  /**
   * Start the Discord client and begin listening for messages
   * @returns Promise that resolves when the client is ready
   */
  async start(): Promise<void> {
    await this.init();

    // Set up message listener for DMs
    this.discordClient.on("messageCreate", async (message: Message) => {
      // Ignore messages from self or other bots
      if (message.author.bot) return;
      
      // Only handle DM messages
      if (message.channel.isDMBased()) {
        await this.handleDirectMessage(message);
      }
    });

    // Set up polling interval if configured
    if (this.config.pollingInterval > 0) {
      const intervalMs = this.config.pollingInterval * 60 * 1000;
      this.checkInterval = setInterval(() => this.checkPendingTasks(), intervalMs);
      console.log(`Polling loop started. Will check every ${this.config.pollingInterval} minutes`);
    }

    console.log("Discord client started. Monitoring for DMs.");
  }

  /**
   * Stop the Discord client and clean up resources
   */
  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    await this.destroy();
    console.log("Discord client stopped");
  }

  /**
   * Handle incoming direct messages
   * @param message The Discord message object
   */
  private async handleDirectMessage(message: Message): Promise<void> {
    try {
      console.log(
        "Handling DM from:",
        `${message.author.tag} (${message.author.id}):`,
        message.content
      );

      const responseText = await this.fetchAgentResponse({
        agentId: this.config.agentId,
        userId: `discord_user_${message.author.id}`,
        roomId: `discord_dm_${message.author.id}`,
        text: message.content,
        type: InputType.TEXT,
      });

      if (responseText && !this.config.dryRun) {
        await this.sendDirectMessage(message.author.id, responseText);
        console.log("Sent response:", responseText);
      }
    } catch (error) {
      console.error("Error handling direct message:", error);
      // Optionally notify user of error
      if (!this.config.dryRun && message.channel.isTextBased() && message.channel.isDMBased()) {
        await message.reply("Sorry, I encountered an error processing your message.");
      }
    }
  }

  /**
   * Fetch response from agent endpoint
   * @param payload Input payload for agent
   * @returns Response text from agent
   */
  private async fetchAgentResponse(payload: {
    agentId: string;
    userId: string;
    roomId: string;
    text: string;
    type: InputType;
  }): Promise<string> {
    const url = "http://localhost:3000/agent/input";
    const body = {
      input: {
        ...payload,
        source: InputSource.DISCORD,
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
      throw new Error(`Failed to fetch agent response: ${(error as Error).message}`);
    }
  }

  /**
   * Check for any pending tasks (placeholder for future implementation)
   */
  private async checkPendingTasks(): Promise<void> {
    // Implement any periodic checks or maintenance tasks here
    console.log("Checking for pending tasks...");
  }

  /**
   * Find a user by their username
   * @param username Discord username to search for
   * @returns Discord user ID if found
   */
  async findUserByUsername(username: string): Promise<string> {
    try {
      // First try to find in cache
      const cachedUser = this.discordClient.users.cache.find(
        u => u.username.toLowerCase() === username.toLowerCase()
      );
      
      if (cachedUser) {
        return cachedUser.id;
      }

      // If not in cache, we'll need the user's ID
      // For now, since we don't have a way to search by username,
      // we'll need to request the ID from the user
      throw new Error(`Unable to find user ${username}. Please provide the user's Discord ID directly.`);
    } catch (error) {
      console.error(`Error finding user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Send a message to a Discord user
   * @param userIdOrUsername User's Discord ID or username
   * @param content Message content or options
   * @returns Promise that resolves when the message is sent
   */
  async sendMessage(
    userIdOrUsername: string, 
    content: string | MessagePayload | MessageOptions
  ): Promise<void> {
    try {
      let userId = userIdOrUsername;
      
      // If not a snowflake ID, try to find user by username
      if (!/^\d+$/.test(userIdOrUsername)) {
        userId = await this.findUserByUsername(userIdOrUsername);
      }
      
      // Store message in memory for context
      if (typeof content === 'string') {
        await createDiscordMemory(
          `discord_user_${userId}`,
          this.config.agentId,
          `discord_dm_${userId}`,
          `Sent: ${content}`,
          "external"
        );
      }
      
      const message = await this.sendDirectMessage(userId, content);
      if (message) {
        console.log(`Message sent to ${userIdOrUsername} (${userId}): ${content}`);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error(`Error sending message to ${userIdOrUsername}:`, error);
      throw error;
    }
  }
}
