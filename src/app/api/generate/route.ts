import { NextResponse } from "next/server";
export async function POST(req: Request) {
    try {
        const { phase, input, prompt, date } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "プロンプトが設定されていません。" },
                { status: 400 }
            );
        }

        // Replace date variable
        const finalPrompt = prompt.replace(/\[日付\]/g, date);

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json(
                { error: "Vercelの環境変数 (GEMINI_API_KEY) が設定されていません。" },
                { status: 500 }
            );
        }
        
        const model = "gemini-3-flash-preview";

        const tools = phase === 1 ? [{ googleSearchRetrieval: {} }] : undefined;

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `
以下の入力データを元に、指示に従ってタスクを実行してください。

【入力データ】
${input}

【指示】
${finalPrompt}
` }] }],
                    tools: tools,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Gemini API Error: ${errText}`);
            }

            const data = await res.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            return NextResponse.json({ text: generatedText });
        } catch (error: any) {
            console.error(`Gemini API Error details in phase ${phase}:`, error);
            return NextResponse.json(
                { error: `[V2-FETCH] Gemini API Error (${phase}): ${error.message || '不明なエラー'}` },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: `[Outer Error] ${error.message || "内部サーバーエラーが発生しました。"}` },
            { status: 500 }
        );
    }
}
