import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { title, body } = await req.json();

        if (!title || !body) {
            return NextResponse.json({ error: "titleとbodyは必須です。" }, { status: 400 });
        }

        const noteApiKey = process.env.NOTE_API_KEY;
        if (!noteApiKey) {
            return NextResponse.json({ error: "Vercelの環境変数 (NOTE_API_KEY) が設定されていません。" }, { status: 500 });
        }

        const res = await fetch("https://note.com/api/v2/notes", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${noteApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                body: body,
                published: false // 下書き保存にする
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Note API Error:", errText);
            return NextResponse.json({ error: `Note API Error: ${res.status} ${errText}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ success: true, data: data });

    } catch (error: any) {
        console.error("Note API Exception:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
