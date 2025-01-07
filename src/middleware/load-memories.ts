import { PrismaClient } from "@prisma/client";
import { AgentMiddleware, Memory } from "../types";

const prisma = new PrismaClient();

type DbMemory = Awaited<ReturnType<typeof prisma.memory.findFirst>>;

interface LoadMemoriesOptions {
	limit?: number;
	type?: string;
}

export function createLoadMemoriesMiddleware(
	options: LoadMemoriesOptions = {}
): AgentMiddleware {
	const { limit = 100 } = options;

	return async (req, res, next) => {
		try {
			const memories = await prisma.memory.findMany({
				where: {
					roomId: req.input.roomId,
				},
				orderBy: {
					createdAt: "desc",
				},
				take: limit,
			});

			req.memories = memories.map(
				(memory: NonNullable<DbMemory>) =>
					({
						id: memory.id,
						userId: memory.userId,
						agentId: memory.agentId,
						roomId: memory.roomId,
						type: memory.type,
						createdAt: memory.createdAt,
						generator: memory.generator,
						content: memory.content, // Now automatically parsed as JSON
					} as Memory)
			);

			await next();
		} catch (error) {
			await res.error(
				new Error(`Failed to load memories: ${(error as Error).message}`)
			);
		}
	};
}

// Export the default instance with standard options
export const loadMemories = createLoadMemoriesMiddleware();
