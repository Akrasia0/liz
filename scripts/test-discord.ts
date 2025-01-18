import { DiscordClient } from "../clients/discord/client";

const config = {
  botToken: process.env.DISCORD_BOT_TOKEN!,
  agentId: "test-agent",
  retryLimit: 3,
  pollingInterval: 1,
  dryRun: false
};

async function main() {
  console.log("Starting Discord client test...");
  
  const client = new DiscordClient({} as any, config);
  
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
