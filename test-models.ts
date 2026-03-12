import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    try {
        // There isn't a direct listModels in this SDK easily exposed for general use without auth/project setup sometimes,
        // but we can try a simple generation with 'gemini-1.5-flash' to verify.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash:", result.response.text());
    } catch (e: any) {
        console.error("Error with gemini-1.5-flash:", e.message);
    }
}

listModels();
