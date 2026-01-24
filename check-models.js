const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

async function main() {
    // Read .env.local manually to avoid installing dotenv
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        try {
            const envPath = path.join(__dirname, '.env.local');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
                if (match) {
                    apiKey = match[1].trim();
                }
            }
        } catch (e) {
            console.error("Error reading .env.local:", e);
        }
    }

    if (!apiKey) {
        console.error("Error: GEMINI_API_KEY not found.");
        return;
    }

    console.log(`Using API Key: ${apiKey.substring(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Fetching available models...");
        // For older versions of the SDK, listModels might not be directly exposed on genAI.
        // But let's try the standard way first.
        // Recent SDKs: genAI.getGenerativeModel... 
        // Actually listModels is usually on the ModelManager or similar, but the JS SDK simplified this?
        // Let's check if the SDK supports listing. If not, we might have to just try specific ones.
        // The google-generative-ai node sdk doesn't always expose listModels directly on the main class in early versions.
        // But let's try to infer from the error message or just try the standard 'gemini-1.5-flash'.

        // Actually, simply trying a generation with a few likely candidates is safer if listModels isn't easy to reach.

        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-pro",
            "gemini-pro",
            "gemini-1.0-pro"
        ];

        for (const modelName of candidates) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`SUCCESS!`);
            } catch (error) {
                if (error.message.includes("404") || error.message.includes("not found")) {
                    console.log(`Failed (Not Found)`);
                } else {
                    console.log(`Failed (Error: ${error.message.split('\n')[0]})`);
                }
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

main();
