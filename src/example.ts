import { AgentFramework } from "./framework";
import { standardMiddleware } from "./middleware";
import {
	Character,
	InputObject,
	InputSource,
	InputType,
	LLMSize,
} from "./types";
import { BaseAgent } from "./agent";
import { LLMUtils } from "./utils/llm";
import { z } from "zod";
import * as readline from "readline";
import { prisma } from "./utils/db";

const llmUtils = new LLMUtils();

// should have a seperate file for this
const sternCharacter: Character = {
	name: "Stern",
	system: `You are Stern, a no-nonsense business advisor known for direct, practical advice.
You never waste time with pleasantries and get straight to the point.
You're deeply knowledgeable about business strategy, efficiency, and management.`,
	bio: [
		"Stern is a direct and efficient business consultant with decades of experience.",
		"Known for transforming struggling businesses into market leaders.",
		"Has advised Fortune 500 CEOs and startup founders alike.",
		"Believes in data-driven decision making and lean operations.",
		"Expert in operational efficiency and strategic planning.",
	],
	lore: [
		"Started as a factory floor manager before rising to consultant status.",
		"Learned efficiency by optimizing assembly lines in the automotive industry.",
		"Developed unique methodology for identifying business inefficiencies.",
		"Known for turning around failing businesses in record time.",
		"Has never failed to improve a client's bottom line.",
	],
	messageExamples: [
		[
			{
				user: "client1",
				content: { text: "How can I improve my business?" },
			},
			{
				user: "Stern",
				content: { text: "Specifics. What are your current metrics?" },
			},
		],
	],
	postExamples: ["Here's a 5-step plan to optimize your operations..."],
	topics: ["business", "strategy", "efficiency", "management"],
	style: {
		all: ["direct", "professional", "concise"],
		chat: ["analytical", "solution-focused"],
		post: ["structured", "detailed"],
	},
	adjectives: ["efficient", "practical", "direct"],
	routes: [], // Empty routes array - we'll add routes after initialization
};

const agent = new BaseAgent(sternCharacter);

// have a routes dir where you can use make the routes as complex as you want.
agent.addRoute({
	name: "conversation",
	description: "Handle natural conversation and general inquiries",
	handler: async (context: string) => {
		const response = await llmUtils.getTextFromLLM(
			context,
			"anthropic/claude-3.5-sonnet"
		);

		await prisma.memory.create({
			data: {
				userId: "cli_user",
				agentId: "Stern",
				roomId: "cli_session",
				type: "agent",
				generator: "llm",
				content: response,
			},
		});
		console.log("\nStern:", response, "\n");
	},
});

agent.addRoute({
	name: "business_advice",
	description: "Provide specific business strategies and recommendations",
	handler: async (context: string) => {
		const adviceSchema = z.object({
			problem: z.string(),
			recommendation: z.string(),
			actionItems: z.array(z.string()),
			metrics: z.array(z.string()),
		});

		const advice = await llmUtils.getObjectFromLLM(
			context,
			adviceSchema,
			LLMSize.LARGE
		);
		// Dont save this object as the content, it will be jsonified and look strange
		await prisma.memory.create({
			data: {
				userId: "cli_user",
				agentId: "Stern",
				roomId: "cli_session",
				type: "agent",
				generator: "llm",
				content: advice?.recommendation,
			},
		});

		console.log("\nStern's Analysis:");
		console.log("Problem:", advice.problem);
		console.log("Recommendation:", advice.recommendation);
		console.log("\nAction Items:");
		advice.actionItems.forEach((item, i) => console.log(`${i + 1}. ${item}`));
		console.log("\nKey Metrics to Track:");
		advice.metrics.forEach((metric, i) => console.log(`${i + 1}. ${metric}`));
		console.log("\n");
	},
});

async function startCLI() {
	const app = new AgentFramework();
	standardMiddleware.forEach((middleware) => app.use(middleware));

	app.onError(async (error, req, res) => {
		console.error("\nError:", error.message);
		console.error("Try asking something else.\n");
	});

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log("\nStern Business Advisor CLI");
	console.log("=========================");
	console.log("Type 'exit' to quit");
	console.log();

	async function processInput(text: string) {
		if (text.toLowerCase() === "exit") {
			rl.close();
			return false;
		}

		const input: InputObject = {
			source: InputSource.NETWORK,
			userId: "cli_user",
			agentId: "Stern",
			roomId: "cli_session",
			type: InputType.TEXT,
			text,
		};

		try {
			await app.process(input, agent);
		} catch (error) {
			console.error("\nSystem Error:", error);
			console.error("Please try again.\n");
		}

		return true;
	}

	function prompt() {
		rl.question("\nYou: ", async (input) => {
			const shouldContinue = await processInput(input);
			if (shouldContinue) {
				prompt();
			} else {
				process.exit(0);
			}
		});
	}

	prompt();
}

// Run CLI if this file is executed directly
if (require.main === module) {
	startCLI().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
