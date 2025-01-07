import { AgentMiddleware } from "../types";
import { prisma } from "../utils/db";

export const createMemoryFromInput: AgentMiddleware = async (
	req,
	res,
	next
) => {
	try {
		// Store the input as a memory
		await prisma.memory.create({
			data: {
				userId: req.input.userId,
				agentId: req.input.agentId,
				roomId: req.input.roomId,
				type: "text",
				generator: "external",
				content: JSON.stringify(req.input), // Store the entire input object
			},
		});

		await next();
	} catch (error) {
		await res.error(
			new Error(`Failed to create memory: ${(error as Error).message}`)
		);
	}
};
