import { DiscordClient } from "../clients/discord/client";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configure logging
const DEBUG = process.env.DEBUG === 'true';
function log(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

const config = {
  botToken: process.env.DISCORD_BOT_TOKEN!,
  agentId: "test-agent",
  retryLimit: 3,
  pollingInterval: 1,
  dryRun: false
};

log("Environment variables loaded");
console.log("Bot token:", process.env.DISCORD_BOT_TOKEN ? "Found" : "Missing");
console.log("Test user ID:", process.env.DISCORD_TEST_USER_ID ? "Found" : "Missing");

async function main() {
  console.log("Starting Discord client test...");
  
  // Create mock agent
  const mockAgent = {
    getAgentId: () => "test-agent",
    getAgentContext: () => "Test agent context",
    getRoutes: () => [],
    getSystemPrompt: () => "Test system prompt",
    addRoute: () => {}
  };

  const client = new DiscordClient(mockAgent, config);

  // Test sending multiple DMs to verify rate limiting
  setTimeout(async () => {
    try {
      console.log("Testing Discord client functionality...");
      
      console.log("Waiting for Discord ID to test messaging functionality...");
      // Note: Replace USER_ID with the actual Discord user ID when provided
      const targetUserId = process.env.DISCORD_TEST_USER_ID;
      
      if (!targetUserId) {
        console.log("No test user ID provided. Please set DISCORD_TEST_USER_ID environment variable.");
        return;
      }

      try {
        // Test 1: Basic message sending
        console.log("Test 1: Sending basic message...");
        await client.sendMessage(targetUserId, "Hello! This is a test message from the Discord bot.");
        console.log("Basic message sent successfully");

        // Test 2: Rate limiting (single message for now)
        console.log("Test 2: Testing rate limiting...");
        await client.sendMessage(targetUserId, "This is a follow-up message (should be delayed by 1000ms)");
        console.log("Rate-limited message sent successfully");
        
        // Test 3: Message with formatting
        console.log("Test 3: Testing message with formatting...");
        await client.sendMessage(
          targetUserId, 
          "This message has **bold text**, *italics*, and `code blocks`.\n" +
          "It also has multiple lines and a [link](https://example.com)."
        );
        console.log("Formatted message sent successfully");
      } catch (error) {
        console.error("Error during message tests:", error);
      }
    } catch (error) {
      console.error("Error in Discord client tests:", error);
      // Type guard for Discord API errors
      if (error && typeof error === 'object' && 'code' in error) {
        const discordError = error as { code: number };
        if (discordError.code === 50035) {
          console.error("Invalid user ID format. Make sure to use Discord's snowflake ID format.");
        }
      }
    }
  }, 5000);
  
  try {
    await client.start();
    console.log("Discord client started successfully");
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log("Stopping Discord client...");
      await client.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Error testing Discord client:", error);
    process.exit(1);
  }
}

main();
