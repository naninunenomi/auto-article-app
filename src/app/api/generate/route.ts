import { NextResponse } from "next/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || "";
        const genAI = new GoogleGenAI({ apiKey });
        const { phase, input, prompt, date } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "プロンプトが設定されていません。" },
                { status: 400 }
            );
        }

        // Replace date variable
        const finalPrompt = prompt.replace(/\\[日付\\]/g, date);

        let resultText = "";

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-flash-latest",
                contents: [
                    {
                        role: 'user',
                        parts: [{
                            text: `
以下の入力データを元に、指示に従ってタスクを実行してください。

【入力データ】
${input}

【指示】
${finalPrompt}
` }]
                    }
                ],
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                }
            });

            resultText = response.text || "";
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
