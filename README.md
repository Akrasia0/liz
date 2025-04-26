# Liz

<div align="center">
  <img src="assets/liz.jpg" alt="Introducing: Liz" width="500" height="500" />
  <p><em>A Framework for AI Agents by <a href="https://akrasia.ai/liz">Akrasia Labs</a></em></p>
</div>

<br/>

Liz is a lightweight framework for building AI agents, reimagined for developers who demand power and simplicity. Inspired by Eliza from AI16Z, but rebuilt from the ground up with a focus on developer experience and control.

## Built for Developers Who Want

- **Direct LLM Control**: Full access to prompts and model interactions
- **Zero Magic**: Minimal abstractions for maximum understanding
- **Ultimate Flexibility**: Build exactly what you need, how you need it

## Quick Start

1. **Clone and Install**

   ```bash
   git clone https://github.com/Akrasia0/liz
   cd liz
   pnpm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   ```

   Required environment variables:

   ```bash
   # Database - Choose one:
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   # or for SQLite:
   DATABASE_URL="file:./prisma/dev.db"

   # LLM APIs
   OPENAI_API_KEY="your-openai-key"
   OPENROUTER_API_KEY="your-openrouter-key"

   # Application
   APP_URL="http://localhost:3000"
   ```

3. **Initialize Database**

   ```bash
   npm run init-db
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## Express-Style Architecture

We use Express-style middleware for a clear, linear processing flow:

```typescript
// Example middleware setup
const framework = new AgentFramework();

// Add standard middleware
framework.use(validateInput);
framework.use(loadMemories);
framework.use(wrapContext);
framework.use(createMemoryFromInput);
framework.use(router);
```

### Creating an Agent

```typescript
const myAgent: Character = {
	name: "Assistant",
	agentId: "unique_id",
	system: "You are a helpful assistant.",
	bio: ["Your agent's backstory"],
	lore: ["Additional background"],
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

const agent = new BaseAgent(myAgent);
```

### Adding Routes

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

### Twitter Integration

```typescript
const twitter = new TwitterClient(agent, {
	username: process.env.TWITTER_USERNAME,
	password: process.env.TWITTER_PASSWORD,
	email: process.env.TWITTER_EMAIL,
	retryLimit: 3,
	postIntervalHours: 4,
	pollingInterval: 5, // minutes
	dryRun: false,
});

await twitter.start();
```

## Core Components

### Looker Module

The Looker module provides content analysis and character management capabilities:

```typescript
// Initialize the Looker
const looker = new Looker({
	modelName: "anthropic/claude-3.5-sonnet",
	temperature: 0.7,
	characterId: "default-character",
});

// Analyze content
const insights = await looker.analyzeContent(textContent);

// Get character information
const character = await looker.getCharacterInfo();

// Summarize tweets
const summary = await looker.summarizeTweets(tweetIds);
```

Key features:

- Content analysis for understanding themes and sentiment
- Character configuration for consistent personality
- Tweet summarization for better context management
- Extensible design for custom analysis pipelines

### Memory System

The memory system uses Prisma with SQLite (or PostgreSQL) to maintain conversation context:

```typescript
interface Memory {
	id: string;
	userId: string;
	agentId: string;
	roomId: string;
	content: any;
	type: string;
	generator: string; // "external" or "llm"
	createdAt: Date;
}
```

Key features:

- Automatic context loading for each request
- Memory creation for both user inputs and agent responses
- Indexed by room, user, and agent IDs
- Configurable memory limits and types

### LLM Integration

Supports multiple LLM providers through a unified interface:

```typescript
const llmUtils = new LLMUtils();

// Text generation
const response = await llmUtils.getTextFromLLM(
	prompt,
	"anthropic/claude-3-sonnet"
);

// Structured output
const result = await llmUtils.getObjectFromLLM(prompt, schema, LLMSize.LARGE);

// Image analysis
const description = await llmUtils.getImageDescriptions(imageUrls);
```

### Twitter Capabilities

- **Automated Posting**: Configurable intervals for regular content
- **Mention Monitoring**: Real-time interaction handling
- **Thread Management**: Automatic thread building and response chaining
- **Rate Limiting**: Built-in rate limiting and retry mechanisms
- **Memory Integration**: Conversational context across interactions

## Docker Support

```bash
# Build and run with Docker Compose
docker-compose up --build
```

Environment configuration in docker-compose.yml:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TEE_MODE=DOCKER
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - TWITTER_USERNAME=${TWITTER_USERNAME}
      - TWITTER_PASSWORD=${TWITTER_PASSWORD}
      - TWITTER_EMAIL=${TWITTER_EMAIL}
    volumes:
      - ./prisma/dev.db:/app/prisma/dev.db
```

## Project Structure

```
src/
├── middleware/       # Pipeline steps
│   ├── validate-input.ts   # Input validation
│   ├── load-memories.ts    # Context loading
│   ├── wrap-context.ts     # Request wrapping
│   ├── create-memory.ts    # Memory creation
│   └── router.ts          # Route handling
├── agent/           # Core agent logic
├── framework/       # Express-style system
├── looker/          # Content analysis system
│   ├── looker.ts    # Analysis utilities
│   └── character.json # Character configuration
├── types/          # TypeScript definitions
├── utils/          # Helper functions
│   ├── llm.ts      # LLM interactions
│   ├── memory.ts   # Memory management
│   ├── db.ts       # Database utilities
│   └── initDb.ts   # DB initialization
└── example/        # Implementation examples

clients/
└── twitter/        # Twitter integration
    ├── client.js   # Main client class
    ├── base.js     # Core functionality
    └── utils.js    # Helper functions
```

## Available Scripts

```bash
# Build the project
npm run build

# Start production
npm start

# Development with auto-reload
npm run dev

# Test Twitter integration
npm run twitter

# Database management
npm run db:init    # Initialize database
npm run db:reset   # Reset database
npm run prisma:studio  # Database UI
```

## Our Philosophy

We believe the best way to build AI agents is to work closely with the prompts and build a set of composable units that can be strung together to make powerful agentic loops. Our approach is informed by Anthropic's research on constructing reliable AI systems.

## Contributing

While Liz is meant to be forked and modified, we welcome contributions to the base template:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT

---

Visit [akrasia.ai/liz](https://akrasia.ai/liz) to learn more.
