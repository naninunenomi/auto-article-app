import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const RESULTS_KEY = "app_results";

export async function GET() {
    try {
        const results = await kv.get(RESULTS_KEY);
        // Return explicit 200 with data or null
        return NextResponse.json({ results: results || null });
    } catch (error: any) {
        console.error("Failed to get results from KV:", error);
        return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { results } = await req.json();

        if (!results) {
            return NextResponse.json({ error: "Results data is required" }, { status: 400 });
        }

        // Save results to KV store
        await kv.set(RESULTS_KEY, results);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to save results to KV:", error);
        return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
    }
}
