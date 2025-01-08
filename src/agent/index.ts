import { Agent, Character, Route } from "../types";

export class BaseAgent implements Agent {
	private character: Character;
	private routes: Route[];

	constructor(character: Character) {
		this.character = character;
		this.routes = character.routes;
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
		if (this.routes.some((r) => r.name === route.name)) {
			throw new Error(`Route with name '${route.name}' already exists`);
		}
		this.routes.push(route);
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
<SYSTEM_PROMPT>
${this.getSystemPrompt()}
</SYSTEM_PROMPT>

<BIO_CONTEXT>
${bioContext}
</BIO_CONTEXT>

<LORE_CONTEXT>
${loreContext}
</LORE_CONTEXT>

<MESSAGE_EXAMPLES>
${messageContext}
</MESSAGE_EXAMPLES>

<POST_EXAMPLES>
${postContext}
</POST_EXAMPLES>

<INTERESTS>
${topicContext}
</INTERESTS>

<STYLE_GUIDELINES>
<ALL_STYLE>
${styleAllContext}
</ALL_STYLE>

<CHAT_STYLE>
${styleChatContext}
</CHAT_STYLE>
</STYLE_GUIDELINES>

<ADJECTIVES>
${adjectiveContext}
</ADJECTIVES>
`.trim();
	}

	public getRoutes(): Route[] {
		return this.routes;
	}
}
