import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export async function initializeDatabase() {
	try {
		const dbPath = path.join(__dirname, "../../prisma/dev.db");
		const migrationPath = path.join(__dirname, "../../prisma/migrations");
		const dbExists = fs.existsSync(dbPath);
		const migrationsExist = fs.existsSync(migrationPath);

		if (!migrationsExist) {
			console.log("Creating initial migration...");
			await execAsync("npx prisma migrate dev --name init");
		} else if (!dbExists) {
			console.log("Deploying existing migrations...");
			await execAsync("npx prisma migrate deploy");
		}

		console.log("Generating Prisma Client...");
		await execAsync("npx prisma generate");

		console.log("Database initialization complete.");
	} catch (error) {
		console.error("Failed to initialize database:", error);
		throw error;
	}
}

// Run if called directly
if (require.main === module) {
	initializeDatabase().catch(console.error);
}
