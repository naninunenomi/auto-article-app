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
        
        const modelsToTry = [
            "gemini-3-flash-preview", 
            "gemini-2.5-flash", 
            "gemini-2.0-flash", 
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest"
        ];
        const tools = phase === 1 ? [{ googleSearchRetrieval: {} }] : undefined;

        let lastErrorText = "";

        for (const model of modelsToTry) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `
以下の入力データを元に、指示に従ってタスクを実行してください。

【入力データ】
${input}

【指示】
${finalPrompt}
` }] }],
                        tools: tools
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    lastErrorText = errText;
                    
                    // If it's a rate limit (429) or model not found/unauthorized (404/403), try the next model
                    if (res.status === 429 || res.status === 404 || res.status === 403) {
                        console.warn(`[Phase ${phase}] Model ${model} failed with ${res.status}. Trying next...`);
                        continue;
                    }
                    throw new Error(`Gemini API Error: ${errText}`);
                }

                const data = await res.json();
                const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                
                console.log(`[Phase ${phase}] Successfully generated using model: ${model}`);
                return NextResponse.json({ text: generatedText });

            } catch (error: any) {
                console.error(`Gemini API Error details in phase ${phase} for model ${model}:`, error);
                // If it's a network error, try the next model
            }
        }

        // If all models failed
        return NextResponse.json(
            { error: `[V2-FETCH] All models failed. Last error: ${lastErrorText || '不明なエラー'}` },
            { status: 500 }
        );

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: `[Outer Error] ${error.message || "内部サーバーエラーが発生しました。"}` },
            { status: 500 }
        );
    }
}
