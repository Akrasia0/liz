# Liz

A lightweight, Express-style template for building AI agents. Inspired by AI16Z's Eliza but focused on simplicity and developer control.

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
Input → Middlewares → Routing → Handler (handlers can be as complex as you want)
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

## How to Use

1. **Fork the Template**

   - Start by forking this repository
   - Modify the code directly to fit your needs

2. **Define Your Agent**

```typescript
const myCharacter: Character = {
	name: "Assistant",
	system: "You are a helpful assistant.",
	bio: ["Your agent's backstory..."],
	// ... other character details
};

const agent = new BaseAgent(myCharacter);
```

3. **Add Route Handlers**

```typescript
agent.addRoute({
	name: "conversation",
	description: "Handle natural conversation",
	handler: async (context) => {
		const response = await llm.getTextFromLLM(context, "your-chosen-model");
		console.log(response);
	},
});
```

4. **Modify the Pipeline**

- Add new middleware in `src/middleware/`
- Modify existing middleware
- Change the processing order

## Example Implementation

Check out `src/example.ts` for a complete implementation of a business advisor agent. Use it as a reference for building your own agents.

## Folder Structure

```
src/
├── middleware/       # Pipeline steps
├── agent/           # Agent implementation
├── framework/       # Core Express-like system
├── types/           # TypeScript definitions
├── utils/           # Utilities (LLM, DB, etc.)
└── example.ts       # Example implementation
```

## Coming Soon

1. **Vector Store Template**

   - Example implementation with Pinecone
   - Semantic search across memories
   - Easy to swap vector store backends

2. **Twitter Bot Template**
   - Basic Twitter bot implementation
   - Interaction handling examples
   - Thread management utilities

## Getting Started

```bash
pnpm install
pnpm run build
npm run dev

```

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENAI_API_KEY="your-openai-key"
OPENROUTER_API_KEY="your-openrouter-key"
APP_URL="http://localhost:3000"
```

## Contributing

While Liz is meant to be forked and modified, we welcome contributions to the base template:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
