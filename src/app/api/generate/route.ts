import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const { phase, input, prompt, date } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "プロンプトが設定されていません。" },
                { status: 400 }
            );
        }

        // Replace date variable
        const finalPrompt = prompt.replace(/\\[日付\\]/g, date);

        // Default model (Using latest stable flash model alias to avoid version not found errors)
        const model = "gemini-flash-latest";

        let resultText = "";

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: [
                    {
                        role: 'user', parts: [{
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
                }
            });

            resultText = response.text || "";
        } catch (genAiError: any) {
            console.error(`Gemini API Error details in phase ${phase}:`, genAiError);
            return NextResponse.json(
                { error: `Gemini APIエラー: ${genAiError.message || '不明なエラー'}` },
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
