"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, FileText, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
    const defaultPrompts = {
        phase2: "以下のリサーチ資料（Phase 1）と指定日時「[日付]」を元に、note掲載用の【無料版記事】を作成してください。\\n...",
        phase3: "以下のリサーチ資料と「無料版記事」の続きとして、【有料版記事】を作成してください。\\n...",
        phase4: "無料版と有料版を結合し、全体のフォーマットを整えてください。",
        phase5: "以下の完成原稿について、誤字脱字やトーンマナーを校正してください。",
        phase6: "以下の校正済み原稿を元に、Podcast用のトークスクリプトを作成してください。",
        phase7: "以下の記事内容をプロモーションするためのX（Twitter）投稿文を複数作成してください。",
        notebookLM_A: "以下のテキストを元に、5分程度の対話形式（ホストとゲスト）のポッドキャスト音声を作成してください。",
        notebookLM_B: "以下のテキストを元に、1分程度の単独語り形式の要約音声を作成してください。"
    };

    const [prompts, setPrompts] = useState(defaultPrompts);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Load from API instead of localStorage
        const fetchPrompts = async () => {
            try {
                const res = await fetch("/api/settings");
                const data = await res.json();
                if (data.prompts) {
                    setPrompts(data.prompts);
                }
            } catch (e) {
                console.error("Failed to fetch prompts from API", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrompts();
    }, []);

    // Prevent hydration mismatch by rendering a placeholder until mounted
    if (!isMounted || isLoading) {
        return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-teal-500">読み込み中...</div>;
    }

    const handleSave = async () => {
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompts })
            });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (e) {
            console.error("Failed to save prompts via API", e);
            alert("保存に失敗しました");
        }
    };

    const handleChange = (key: keyof typeof prompts, value: string) => {
        setPrompts((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 pb-24 font-sans selection:bg-teal-500/30">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight">プロンプト設定</h1>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all min-w-[100px]"
                >
                    {isSaved ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>保存完了</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>保存</span>
                        </>
                    )}
                </button>
            </header>

            <main className="px-6 py-8 max-w-md mx-auto space-y-8">
                <p className="text-sm text-neutral-400">
                    生成AIに渡すプロンプト（指示文）をフェーズごとに編集できます。
                    <br />文中に <code>[日付]</code> と記述すると、メイン画面で指定した日付に自動変換されます。
                </p>

                <div className="space-y-6">
                    {Object.entries(prompts).map(([key, value]) => {
                        const isNotebookLM = key.startsWith("notebookLM");
                        const phaseNumber = key.replace("phase", "");
                        const labelName = isNotebookLM
                            ? `NotebookLM 音声用プロンプト ${key.split("_")[1]}`
                            : `Phase ${phaseNumber} プロンプト`;
                        const iconText = isNotebookLM ? "N" : phaseNumber;

                        return (
                            <div key={key} className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-teal-400">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 text-xs">
                                        {iconText}
                                    </span>
                                    {labelName}
                                </label>
                                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
                                    <textarea
                                        value={value}
                                        onChange={(e) => handleChange(key as keyof typeof prompts, e.target.value)}
                                        className="w-full h-32 bg-transparent text-neutral-200 outline-none resize-none p-3 text-sm"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
