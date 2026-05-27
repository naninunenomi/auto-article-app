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
        
        // Gemini 3系の最新ペイロード仕様に準拠
        const model = "gemini-3-flash-preview";
        
        // 旧 googleSearchRetrieval から最新の googleSearch への変更
        const tools = phase === 1 ? [{ googleSearch: {} }] : undefined;

        console.log(`[Phase ${phase}] 実行開始... モデル: ${model}`);

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
                tools: tools,
                // Deep Research（深層リサーチ）用の思考プロセス設定を追加
                generationConfig: {
                    thinkingConfig: { thinkingBudget: 1024 }
                }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Phase ${phase}] API仕様エラー（生レスポンス）:`, errText);
            
            // 400エラー等のAPI仕様不整合や、429の一時制限エラーをフロントエンドへ詳細に返却
            return NextResponse.json(
                { error: `[V2-FETCH] Gemini API Error (${res.status}): ${errText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        console.log(`[Phase ${phase}] 成功しました。`);
        return NextResponse.json({ text: generatedText });

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: `[Outer Error] ${error.message || "内部サーバーエラーが発生しました。"}` },
            { status: 500 }
        );
    }
}
