# Liz

An Express-style framework for processing agent interactions through middleware chains. The framework uses a req/res/next pattern familiar to Express developers while maintaining sophisticated agent and memory management capabilities.

## Features

- 🔄 Express-style middleware system
- 🤖 Flexible agent configuration
- 💾 Built-in memory management
- 🧠 LLM utilities for decision making
- 🛣️ Dynamic routing based on context
- 🔌 Extensible architecture

## Installation

```bash
npm install liz
```

## Quick Start

```typescript
import {
	AgentFramework,
	standardMiddleware,
	Agent,
	Character,
	InputObject,
	InputSource,
	InputType,
} from "liz";

// Create your agent implementation
class MyAgent implements Agent {
	constructor(private character: Character) {}

	getAgentContext(): string {
		return `Character: ${this.character.name}\nSystem: ${this.character.system}`;
	}

	getRoutes() {
		return new Map([
			[
				"conversation",
				{
					name: "conversation",
					description: "Handle natural conversation",
					handler: async (context: string) => {
						// Implement conversation handling
					},
				},
			],
		]);
	}
}

// Initialize framework
const app = new AgentFramework();

// Use standard middleware stack
standardMiddleware.forEach((middleware) => app.use(middleware));

// Add error handling
app.onError(async (error, req, res) => {
	console.error("Error:", error);
});

// Create agent instance
const agent = new MyAgent({
	name: "Assistant",
	system: "You are a helpful assistant.",
	// ... other character config
});

// Process input
const input: InputObject = {
	source: InputSource.DISCORD,
	userId: "user123",
	agentId: "Assistant",
	roomId: "room456",
	type: InputType.TEXT,
	text: "Hello!",
};

await app.process(input, agent);
```

## Middleware System

The framework uses a middleware chain system similar to Express. Each middleware function has access to the request object, response object, and next function.

```typescript
type AgentMiddleware = (
	req: AgentRequest,
	res: AgentResponse,
	next: () => Promise<void>
) => Promise<void>;
```

### Standard Middleware Stack

1. `validateInput`: Validates incoming request data
2. `createMemory`: Stores the input as a memory
3. `loadMemories`: Loads relevant conversation history
4. `wrapContext`: Combines memories, agent context, and current input
5. `router`: Routes to appropriate handler based on context

### Custom Middleware

Create your own middleware:

```typescript
const customMiddleware: AgentMiddleware = async (req, res, next) => {
	// Pre-processing
	console.log("Processing request:", req.input);

	await next();

	// Post-processing
	console.log("Request processed");
};

app.use(customMiddleware);
```

## Database Setup

The framework uses Prisma for database management. Set up your database:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

## Environment Variables

Create a .env file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENAI_API_KEY="your-openai-key"
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Start production server
npm start
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
