import { NextResponse } from "next/server";

// この処理の最大待ち時間（秒）。現在のプラン上限である300秒に設定。
// ※「Fluid Compute」をオンにすれば最大800秒まで延ばせる。
export const maxDuration = 300;

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
                role: "user",
                parts: [{ 
                    text: `以下の入力データを元に、指示に従ってタスクを実行してください。\n\n【入力データ】\n${input}\n\n【指示】\n${finalPrompt}` 
                }] 
            }],
            tools: tools
        };

        // 3. thinking（考える機能）の制御。
        // gemini-3系は既定で「考えてから書く」ため生成が遅く、長文のPhase3が
        // タイムアウトしやすい。調べ物が必要なPhase1だけ考えさせ、
        // 記事を書くだけのPhase2以降は思考をオフ(0)にして高速化する。
        if (model.includes("gemini-3")) {
            requestBody.generationConfig = {
                thinkingConfig: {
                    thinkingBudget: phase === 1 ? 1024 : 0
                }
            };
        }

        console.log(`[Phase ${phase}] 実行開始... モデル: ${model}`);

        let fullText = "";
        let isDone = false;
        let loopCount = 0;
        const MAX_LOOPS = 4;

        while (!isDone && loopCount < MAX_LOOPS) {
            loopCount++;

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
            const candidate = data.candidates?.[0];
            const generatedText = candidate?.content?.parts?.map((p: any) => p.text || "").join("") || "";
            const finishReason = candidate?.finishReason;
            
            console.log(`[Phase ${phase}] Loop ${loopCount} finishReason: ${finishReason}`);
            
            fullText += generatedText;

            if (finishReason === "MAX_TOKENS" && loopCount < MAX_LOOPS) {
                console.log(`[Phase ${phase}] MAX_TOKENS到達 (Loop ${loopCount})。続きをリクエストします...`);
                // Append model's response
                requestBody.contents.push({ role: "model", parts: [{ text: generatedText }] });
                // Append prompt to continue
                requestBody.contents.push({ role: "user", parts: [{ text: "出力が文字数制限で途切れています。直前の文章の続きから、省略せずにそのまま出力を継続してください。" }] });
            } else {
                isDone = true;
            }
        }
        
        console.log(`[Phase ${phase}] 成功しました。ループ回数: ${loopCount}`);
        return NextResponse.json({ result: fullText });

    } catch (error: any) {
        console.error(`Unexpected Error in phase:`, error);
        return NextResponse.json(
            { error: `[Outer Error] ${error.message || "内部サーバーエラーが発生しました。"}` },
            { status: 500 }
        );
    }
}
