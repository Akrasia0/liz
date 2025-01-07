const { z } = require('zod');

const twitterConfigSchema = z.object({
    username: z.string().min(1, "Twitter username is required"),
    password: z.string().min(1, "Twitter password is required"),
    email: z.string().email("Valid email is required"),
    twoFactorSecret: z.string().optional(),
    retryLimit: z.number().int().min(1).default(5),
    postIntervalHours: z.number().int().min(1).default(4),
    enableActions: z.boolean().default(false)
});

module.exports = {
    twitterConfigSchema
};