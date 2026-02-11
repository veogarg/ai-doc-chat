import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Manually read .env file
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy model init to get client, actually we need the client itself

    try {
        // Accessing the model manager directly if possible, or just using a known endpoint?
        // The SDK doesn't expose listModels directly on the client instance in some versions?
        // Let's try to use the `getGenerativeModel` to see if we can just infer or use a different method.
        // Actually the error message "Call ListModels to see the list" suggests it's an API method.

        // Let's try to make a raw request if the SDK doesn't support it easily, 
        // OR better, let's assume the SDK might have it on the class or instance.
        // Checking SDK docs or source would be ideal but I will try a standard pattern first.

        console.log("Listing models...");
        // There isn't a direct listModels on genAI instance in the current SDK version likely.
        // But let's try to use a simple fetch to the API endpoint to be sure what's available.

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No API key found");
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available models:");
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
