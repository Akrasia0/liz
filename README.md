# Liz

A lightweight, Express-style template for building AI agents with integrated social capabilities. Inspired by AI16Z's Eliza but focused on simplicity and developer control.

## Philosophy

Liz isn't a library - it's a starting point. Rather than creating abstractions and asking you to learn them, Liz provides a minimal, Express-style template that you can freely modify. Many modern agent frameworks add layers of abstraction between developers and LLMs, making it harder to understand and control what's happening. Liz takes the opposite approach:

- **Fork & Hack**: Clone the repo and modify it to fit your needs
- **Transparent**: Every part of the pipeline is visible, modifiable and linear
- **Express-style**: Familiar middleware pattern that's easy to understand
- **Developer-first**: Work directly with LLMs instead of hiding them behind abstractions
- **Lightweight**: Small, focused codebase that you can build upon

## Architecture

Liz uses Express-style middleware for a clear, linear processing flow:

```
Input → Middleware → Router → Handler
```

Each step is a middleware function that you can modify:

```typescript
// Add your own middleware
const customMiddleware: AgentMiddleware = async (req, res, next) => {
	// Modify request
	req.customData = await someProcess();
	// Continue chain
	await next();
	// Post-process
	console.log("Request handled");
};
app.use(customMiddleware);
```

## Built-in Features

### Memory System

- SQLite-based persistent storage using Prisma
- Automatic memory loading for context
- Memory creation for both user inputs and agent responses
- Indexed by room, user, and agent IDs

### Twitter Integration

- Automated posting with configurable intervals
- Mention monitoring and response handling
- Thread building and management
- Rate limiting and retry mechanisms
- Conversation context building

### LLM Integration

- OpenAI integration with type-safe responses
- OpenRouter API support for multiple models
- Structured output parsing with Zod
- Different model sizes for different tasks
- Built-in prompt templates

## How to Use

1. **Fork the Template**

   - Start by forking this repository
   - Modify the code directly to fit your needs

2. **Define Your Agent**

```typescript
const myCharacter: Character = {
	name: "Assistant",
	agentId: "unique_id",
	system: "You are a helpful assistant.",
	bio: ["Your agent's backstory..."],
	lore: ["Additional background..."],
	messageExamples: [], // Example conversations
	postExamples: [], // Example social posts
	topics: ["expertise1", "expertise2"],
	style: {
		all: ["consistent", "helpful"],
		chat: ["conversational"],
		post: ["engaging"],
	},
	adjectives: ["friendly", "knowledgeable"],
};
const agent = new BaseAgent(myCharacter);
```

3. **Add Route Handlers**

```typescript
agent.addRoute({
	name: "conversation",
	description: "Handle natural conversation",
	handler: async (context, req, res) => {
		const response = await llmUtils.getTextFromLLM(
			context,
			"anthropic/claude-3-sonnet"
		);
		await res.send(response);
	},
});
```

4. **Set Up Twitter Bot (Optional)**

```typescript
const twitter = new TwitterClient(agent, {
	username: process.env.TWITTER_USERNAME,
	password: process.env.TWITTER_PASSWORD,
	email: process.env.TWITTER_EMAIL,
	retryLimit: 3,
	postIntervalHours: 4,
});

await twitter.start();
```

## Folder Structure

```
src/
├── middleware/       # Pipeline steps
│   ├── validate-input.ts
│   ├── load-memories.ts
│   ├── wrap-context.ts
│   ├── create-memory.ts
│   └── router.ts
├── agent/           # Agent implementation
├── framework/       # Core Express-like system
├── types/          # TypeScript definitions
├── utils/          # Utilities (LLM, DB, etc.)
└── example/        # Example implementations
    ├── example.ts
    └── test-twitter.js

clients/
└── twitter/        # Twitter client implementation
    ├── client.js
    ├── base.js
    └── utils.js

prisma/             # Database schema and migrations
└── schema.prisma
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment example
cp .env.example .env

# Initialize database
npm run init-db

# Start development
npm run dev
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# LLM APIs
OPENAI_API_KEY="your-openai-key"
OPENROUTER_API_KEY="your-openrouter-key"

# Application
APP_URL="http://localhost:3000"

# Twitter (Optional)
TWITTER_USERNAME="your-username"
TWITTER_PASSWORD="your-password"
TWITTER_EMAIL="your-email"
TWITTER_2FA_SECRET="optional-2fa-secret"
```

## Coming Soon

1. **Vector Store Template**

   - Example implementation with Pinecone
   - Semantic search across memories
   - Easy to swap vector store backends

2. **Twitter Bot Template** ✓
   - Basic Twitter bot implementation ✓
   - Interaction handling examples ✓
   - Thread management utilities ✓

## Contributing

While Liz is meant to be forked and modified, we welcome contributions to the base template:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
