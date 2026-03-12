import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || "";
        const genAI = new GoogleGenerativeAI(apiKey);
        const { phase, input, prompt, date } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "プロンプトが設定されていません。" },
                { status: 400 }
            );
        }

        // Replace date variable
        const finalPrompt = prompt.replace(/\\[日付\\]/g, date);

        // Use stable 1.5 Flash model variant
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048, // Limit length to avoid timeouts
            }
        });

        let resultText = "";

        try {
            const result = await model.generateContent(`
以下の入力データを元に、指示に従ってタスクを実行してください。

【入力データ】
${input}

【指示】
${finalPrompt}
`);
            const response = await result.response;
            resultText = response.text();
        } catch (genAiError: any) {
            console.error(`Gemini API Error details in phase ${phase}:`, genAiError);
            return NextResponse.json(
                { error: `Gemini API Error (${phase}): ${genAiError.message || '不明なエラー'}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ result: resultText });

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: "内部サーバーエラーが発生しました。" },
            { status: 500 }
        );
    }
}
