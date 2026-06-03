import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { phase, input, prompt, date, modelName } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "プロンプトが設定されていません。" },
                { status: 400 }
            );
        }

        // Replace date variable
        const finalPrompt = prompt.replace(/\[日付\]/g, date || "");

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json(
                { error: "Vercelの環境変数 (GEMINI_API_KEY) が設定されていません。" },
                { status: 500 }
            );
        }
        
        const model = modelName || "gemini-3-flash-preview";
        
        // 1. tools の定義 (Phase 1 のみ Google検索グラウンディング)
        const tools = phase === 1 ? [{ googleSearch: {} }] : undefined;

        // 2. リクエストボディの基本構造を作成
        const requestBody: any = {
            contents: [{ 
                parts: [{ 
                    text: `以下の入力データを元に、指示に従ってタスクを実行してください。\n\n【入力データ】\n${input}\n\n【指示】\n${finalPrompt}` 
                }] 
            }],
            tools: tools
        };

        // 3. 【修正点】Deep Researchが必要な Phase 1 のみに限定して付与する
        // ※Geminiの公式API仕様では、thinkingConfigは必ず generationConfig の「中」に配置する必要があります
        if (phase === 1 && model.includes("gemini-3")) {
            requestBody.generationConfig = {
                thinkingConfig: {
                    thinkingBudget: 1024
                }
            };
        }

        console.log(`[Phase ${phase}] 実行開始... モデル: ${model}`);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody) // 修正した構造を送信
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Phase ${phase}] API仕様エラー（生レスポンス）:`, errText);
            
            return NextResponse.json(
                { error: `[V2-FETCH] Gemini API Error (${res.status}): ${errText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        console.log(`[Phase ${phase}] 成功しました。`);
        return NextResponse.json({ result: generatedText });

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: `[Outer Error] ${error.message || "内部サーバーエラーが発生しました。"}` },
            { status: 500 }
        );
    }
}
