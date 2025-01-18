import { EventEmitter } from "events";
import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import { RequestQueue } from "../utils/request-queue";

export interface DiscordConfig {
  botToken: string;
  agentId: string;
  retryLimit: number;
  pollingInterval: number;
  dryRun?: boolean;
}

/**
 * Base Discord client class handling core Discord.js functionality
 * Similar to TwitterBase, provides basic Discord operations
 */
export class DiscordBase extends EventEmitter {
  protected discordClient: Client;
  protected requestQueue: RequestQueue;
  protected config: DiscordConfig;
  protected isInitialized: boolean = false;

  constructor(agent: any, config: DiscordConfig) {
    super();
    this.config = config;
    this.requestQueue = new RequestQueue();
    
    // Initialize Discord client with required intents
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel, Partials.Message] // Required for DM handling
    });
  }

  /**
   * Initialize Discord client and handle connection
   * @throws {Error} If login fails after maximum retries
   */
  async init(): Promise<void> {
    console.log("Initializing Discord client...");
    let retries = this.config.retryLimit;

    while (retries > 0) {
      try {
        if (this.isInitialized) {
          console.log("Already logged in");
          break;
        }

        await this.discordClient.login(this.config.botToken);
        
        // Wait for ready event
        await new Promise<void>((resolve) => {
          this.discordClient.once('ready', () => {
            console.log(`Logged in as ${this.discordClient.user?.tag}`);
            this.isInitialized = true;
            resolve();
          });
        });

        break;
      } catch (error) {
        console.error(`Login attempt failed: ${(error as Error).message}`);
        retries--;
        
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!this.isInitialized) {
      throw new Error("Failed to login after maximum retries");
    }
  }

  /**
   * Send a direct message to a user
   * @param userId User's Discord ID
   * @param content Message content
   * @returns The sent message or null if failed
   */
  protected async sendDirectMessage(userId: string, content: string): Promise<Message | null> {
    return this.requestQueue.add(async () => {
      try {
        const user = await this.discordClient.users.fetch(userId);
        const message = await user.send(content);
        return message;
      } catch (error) {
        console.error(`Error sending DM to ${userId}:`, error);
        return null;
      }
    });
  }

  /**
   * Utility method to delay execution
   * @param ms Milliseconds to delay
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources and disconnect
   */
  async destroy(): Promise<void> {
    this.discordClient.destroy();
    this.isInitialized = false;
    console.log("Discord client destroyed");
  }
}
