import { AgentMiddleware } from "../types";
import { prisma } from "../utils/db";

export const createMemoryFromInput: AgentMiddleware = async (
	req,
	res,
	next
) => {
	try {
		await prisma.memory.create({
			data: {
				userId: req.input.userId,
				agentId: req.input.agentId,
				roomId: req.input.roomId,
				type: req.input.type,
				generator: "external",
				content: JSON.stringify(req.input),
			},
		});

		await next();
	} catch (error) {
		await res.error(
			new Error(`Failed to create memory: ${(error as Error).message}`)
		);
	}
};
