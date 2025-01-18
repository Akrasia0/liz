import { DiscordClient } from "../clients/discord/client";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  botToken: process.env.DISCORD_BOT_TOKEN!,
  agentId: "test-agent",
  retryLimit: 3,
  pollingInterval: 1,
  dryRun: false
};

console.log("Bot token:", process.env.DISCORD_BOT_TOKEN ? "Found" : "Missing");

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
      
      // Test 1: Basic message
      console.log("Test 1: Sending basic message...");
      await client.sendMessage("ca1zar", "Hello! This is a test message from the Discord bot.");
      
      // Test 2: Rate limiting (send messages in quick succession)
      console.log("Test 2: Testing rate limiting...");
      const messages = [
        "Test message 1 - Testing rate limiting",
        "Test message 2 - Should be delayed by 1000ms",
        "Test message 3 - Should be delayed by 1000ms"
      ];
      
      for (const msg of messages) {
        await client.sendMessage("ca1zar", msg);
      }
      
      console.log("All test messages sent successfully");
    } catch (error) {
      console.error("Error in Discord client tests:", error);
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
