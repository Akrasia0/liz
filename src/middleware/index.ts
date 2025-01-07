import { validateInput } from "./validate-input";
import { loadMemories } from "./load-memories";
import { wrapContext } from "./wrap-context";
import { router } from "./router";
import { createMemory } from "./create-memory";
import { AgentMiddleware } from "../types";

// Export individual middleware
export { validateInput, loadMemories, wrapContext, router, createMemory };

// Export standard middleware stack
export const standardMiddleware: AgentMiddleware[] = [
	validateInput,
	createMemory, // Store the input first // TODO: might need to change
	loadMemories, // Then load previous memories
	wrapContext, // Wrap everything in context
	router, // Finally, route to appropriate handler
];
