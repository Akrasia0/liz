import {
	AgentMiddleware,
	AgentRequest,
	AgentResponse,
	InputObject,
	Agent,
} from "../types";

export class AgentFramework {
	private middlewares: AgentMiddleware[] = [];
	private errorHandlers: Array<
		(error: any, req: AgentRequest, res: AgentResponse) => Promise<void>
	> = [];

	use(middleware: AgentMiddleware): this {
		this.middlewares.push(middleware);
		return this;
	}

	onError(
		handler: (
			error: any,
			req: AgentRequest,
			res: AgentResponse
		) => Promise<void>
	): this {
		this.errorHandlers.push(handler);
		return this;
	}

	private createResponse(req: AgentRequest): AgentResponse {
		const res: AgentResponse = {
			send: async (content: any) => {
				// Implementation would depend on the input source
				console.log("Sending response:", content);
			},
			error: async (error: any) => {
				// Handle error based on input source
				console.error("Error:", error);
				await this.handleError(error, req, res);
			},
		};
		return res;
	}

	private async handleError(
		error: any,
		req: AgentRequest,
		res: AgentResponse
	): Promise<void> {
		for (const handler of this.errorHandlers) {
			try {
				await handler(error, req, res);
			} catch (handlerError) {
				console.error("Error in error handler:", handlerError);
			}
		}
	}

	private async executeMiddleware(
		index: number,
		req: AgentRequest,
		res: AgentResponse
	): Promise<void> {
		if (index >= this.middlewares.length) {
			return;
		}

		const middleware = this.middlewares[index];
		const next = async () => {
			await this.executeMiddleware(index + 1, req, res);
		};

		try {
			await middleware(req, res, next);
		} catch (error) {
			await res.error(error);
		}
	}

	async process(input: InputObject, agent: Agent): Promise<void> {
		const req: AgentRequest = {
			input,
			agent,
		};

		const res = this.createResponse(req);

		try {
			await this.executeMiddleware(0, req, res);
		} catch (error) {
			await res.error(error);
		}
	}
}
