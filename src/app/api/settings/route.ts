import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const PROMPTS_KEY = "app_prompts";

export async function GET() {
    try {
        const prompts = await kv.get(PROMPTS_KEY);
        // Return explicit 200 with data or null
        return NextResponse.json({ prompts: prompts || null });
    } catch (error: any) {
        console.error("Failed to get prompts from KV:", error);
        return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { prompts } = await req.json();

        if (!prompts) {
            return NextResponse.json({ error: "Prompts data is required" }, { status: 400 });
        }

        // Save prompts to KV store
        await kv.set(PROMPTS_KEY, prompts);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to save prompts to KV:", error);
        return NextResponse.json({ error: "Failed to save prompts" }, { status: 500 });
    }
}
