import { Agent, Character, Route } from "../types";

export class BaseAgent implements Agent {
	private character: Character;
	private routes: Map<string, Route>;

	constructor(character: Character) {
		this.character = character;
		this.routes = new Map(character.routes.map((route) => [route.name, route]));
	}

	private getRandomElements<T>(arr: T[], count: number): T[] {
		const shuffled = [...arr].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(count, arr.length));
	}

	private formatMessageExamples(
		examples: Character["messageExamples"]
	): string {
		return this.getRandomElements(examples, 3)
			.map((conversation) =>
				conversation.map((msg) => `${msg.user}: ${msg.content.text}`).join("\n")
			)
			.join("\n\n");
	}

	public getAgentId(): string {
		return this.character.agentId;
	}

	public getSystemPrompt(): string {
		return this.character.system;
	}

	public addRoute(route: Route): void {
		if (this.routes.has(route.name)) {
			throw new Error(`Route with name '${route.name}' already exists`);
		}
		this.routes.set(route.name, route);
	}

	public getAgentContext(): string {
		const bioContext = this.getRandomElements(this.character.bio, 3).join("\n");
		const loreContext = this.getRandomElements(this.character.lore, 3).join(
			"\n"
		);
		const messageContext = this.formatMessageExamples(
			this.character.messageExamples
		);
		const postContext = this.getRandomElements(
			this.character.postExamples,
			3
		).join("\n");
		const topicContext = this.getRandomElements(this.character.topics, 3).join(
			"\n"
		);
		const styleAllContext = this.getRandomElements(
			this.character.style.all,
			3
		).join("\n");
		const styleChatContext = this.getRandomElements(
			this.character.style.chat,
			3
		).join("\n");
		const stylePostContext = this.getRandomElements(
			this.character.style.post,
			3
		).join("\n");
		const adjectiveContext = this.getRandomElements(
			this.character.adjectives,
			3
		).join(", ");

		return `
Bio Context:
${bioContext}

Lore Context:
${loreContext}

Example Interactions:
${messageContext}

Example Posts:
${postContext}

Areas of Expertise:
${topicContext}

Style Guidelines:
General: ${styleAllContext}
Chat: ${styleChatContext}
Post: ${stylePostContext}

Character Traits:
${adjectiveContext}
`.trim();
	}

	public getRoutes(): Map<string, Route> {
		return this.routes;
	}
}
