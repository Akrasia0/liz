import express, { Express, Request, Response } from "express";
import { AgentFramework } from "../framework";
import { standardMiddleware } from "../middleware";
import {
	Character,
	InputObject,
	InputSource,
	InputType,
	LLMSize,
} from "../types";
import { BaseAgent } from "../agent";
import { LLMUtils } from "../utils/llm";
import { z } from "zod";
import { prisma } from "../utils/db";
import readline from "readline";
import fetch from "node-fetch";

// Initialize Express and LLM utils
const app: Express = express();
app.use(express.json());
const llmUtils = new LLMUtils();

// Initialize framework with middleware
const framework = new AgentFramework();
standardMiddleware.forEach((middleware) => framework.use(middleware));

// Define Stern character (import from another file for real usecases)
const sternCharacter: Character = {
	name: "Stern",
	agentId: "stern",
	system: `You are Stern, a no-nonsense business advisor known for direct, practical advice.`,
	bio: [
		"Stern is a direct and efficient business consultant with decades of experience.",
	],
	lore: [
		"Started as a factory floor manager before rising to consultant status.",
	],
	messageExamples: [
		[
			{ user: "client1", content: { text: "How can I improve my business?" } },
			{
				user: "Stern",
				content: { text: "Specifics. What are your current metrics?" },
			},
		],
	],
	postExamples: ["Here's a 5-step plan to optimize your operations..."],
	topics: ["business", "strategy", "efficiency"],
	style: {
		all: ["direct", "professional"],
		chat: ["analytical"],
		post: ["structured"],
	},
	adjectives: ["efficient", "practical"],
	routes: [],
};

// Initialize agent(s)
const stern = new BaseAgent(sternCharacter);
const agents = [stern];

// Add routes. In real usecases, this would be a imported route from a different file
stern.addRoute({
	name: "conversation",
	description: "Handle conversation",
	handler: async (context: string, req, res) => {
		const response = await llmUtils.getTextFromLLM(
			context,
			"anthropic/claude-3.5-sonnet"
		);

		await prisma.memory.create({
			data: {
				userId: req.input.userId,
				agentId: stern.getAgentId(),
				roomId: req.input.roomId,
				type: "text",
				generator: "llm",
				content: JSON.stringify({ text: response }),
			},
		});

		await res.send(response);
	},
});

// Add API endpoint
app.post("/agent/input", (req: Request, res: Response) => {
	try {
		const agentId = req.body.input.agentId;
		const agent = agents.find((agent) => agent.getAgentId() === agentId);

		if (!agent) {
			return res.status(404).json({ error: "Agent not found" });
		}

		const bodyInput = req.body.input;
		const input: InputObject = {
			source: InputSource.NETWORK,
			userId: bodyInput.userId,
			agentId: stern.getAgentId(),
			roomId: `${agentId}_${bodyInput.userId}`,
			type: InputType.TEXT,
			text: bodyInput.text,
		};

		framework.process(input, stern, res);
	} catch (error) {
		console.error("Server error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

// CLI Interface
async function startCLI() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log("\nStern Business Advisor CLI");
	console.log("=========================");

	async function prompt() {
		rl.question("\nYou: ", async (text) => {
			try {
				const response = await fetch("http://localhost:3000/agent/input", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						input: {
							agentId: "stern",
							userId: "cli_user",
							text: text,
						},
					}),
				});

				const data = await response.json();
				console.log("\nStern:", data);
				prompt();
			} catch (error) {
				console.error("\nError:", error);
				prompt();
			}
		});
	}

	prompt();
}

const PORT = process.env.PORT || 3000;
let server: any;

async function start() {
	server = app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
		startCLI();
	});
}

if (require.main === module) {
	start().catch(console.error);
}
