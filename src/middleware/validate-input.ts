import { AgentMiddleware } from "../types";

export const validateInput: AgentMiddleware = async (req, res, next) => {
	const { input } = req;

	// Validate required fields
	if (!input.userId || !input.agentId || !input.type) {
		return res.error(new Error("Invalid input: missing required fields"));
	}

	// Validate input type-specific fields
	switch (input.type) {
		case "text":
			if (!input.text) {
				return res.error(new Error("Text input requires text field"));
			}
			break;
		// case "image":
		// 	if (!input.imageUrl) {
		// 		return res.error(new Error("Image input requires imageUrl field"));
		// 	}
		// 	break;
		case "text_and_image":
			if (!input.text || !input.imageUrls || input.imageUrls.length === 0) {
				return res.error(
					new Error(
						"Text and image input requires both text and imageUrls fields"
					)
				);
			}
			break;
		// case "audio":
		// 	if (!input.audioUrl) {
		// 		return res.error(new Error("Audio input requires audioUrl field"));
		// 	}
		// 	break;
		// case "video":
		// 	if (!input.videoUrl) {
		// 		return res.error(new Error("Video input requires videoUrl field"));
		// 	}
		// 	break;
	}

	await next();
};
