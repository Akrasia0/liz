export enum InputType {
	TEXT = "text",
	IMAGE = "image",
	TEXT_AND_IMAGE = "text_and_image",
	AUDIO = "audio",
	VIDEO = "video",
}

export enum InputSource {
	NETWORK = "network",
	TWITTER = "twitter",
	DISCORD = "discord",
	SMS = "sms",
	TELEGRAM = "telegram",
}

export enum LLMSize {
	SMALL = "small", // gpt-4o-mini
	LARGE = "large", // gpt-4o
}

export interface InputObject {
	source: InputSource;
	userId: string;
	agentId: string;
	roomId: string;
	type: InputType;
	text?: string;
	imageUrls?: string[];
	audioUrl?: string;
	videoUrl?: string;
	[key: string]: any;
}

export interface Character {
	agentId: string;
	name: string;
	system: string;
	bio: string[];
	lore: string[];
	messageExamples: Array<
		Array<{
			user: string;
			content: {
				text: string;
			};
		}>
	>;
	postExamples: string[];
	topics: string[];
	style: {
		all: string[];
		chat: string[];
		post: string[];
	};
	adjectives: string[];
	routes: Route[];
}

export interface Route {
	name: string;
	description: string;
	handler: (
		context: string,
		req: AgentRequest,
		res: AgentResponse
	) => Promise<void>;
}

export interface AgentRequest {
	input: InputObject;
	agent: Agent;
	context?: string;
	memories?: Memory[];
	[key: string]: any;
}

export interface AgentResponse {
	send: (content: any) => Promise<void>;
	error: (error: any) => Promise<void>;
	[key: string]: any;
}

export interface Memory {
	id: string;
	userId: string;
	agentId: string;
	roomId: string;
	content: any;
	type: string;
	generator: string; // "external" or "llm"
	createdAt: Date;
}

export type AgentMiddleware = (
	req: AgentRequest,
	res: AgentResponse,
	next: () => Promise<void>
) => Promise<void>;

export interface Agent {
	getAgentContext(): string;
	getRoutes(): Route[];
	getSystemPrompt(): string;
	addRoute(route: Route): void;
	getAgentId(): string;
}
