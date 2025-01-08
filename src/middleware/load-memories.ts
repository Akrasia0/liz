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
					// roomId: req.input.roomId,
					userId: req.input.userId,
				},
				orderBy: {
					createdAt: "desc",
				},
				take: limit,
			});

			req.memories = memories
				.map((memory: NonNullable<DbMemory>) => {
					try {
						return {
							id: memory.id,
							userId: memory.userId,
							agentId: memory.agentId,
							roomId: memory.roomId,
							type: memory.type,
							createdAt: memory.createdAt,
							generator: memory.generator,
							content: JSON.parse(memory.content),
						} as Memory;
					} catch (e) {
						console.log("Failed to load a memory");
						return undefined;
					}
				})
				.filter((memory): memory is Memory => memory !== undefined);

			await next();
		} catch (error) {
			await res.error(
				new Error(`Failed to load memories: ${(error as Error).message}`)
			);
		}
	};
}

export const loadMemories = createLoadMemoriesMiddleware();
