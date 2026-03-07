"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Play,
  Settings,
  CheckCircle2,
  Circle,
  Loader2,
  FileCheck2,
  Mic,
  Twitter,
  ChevronRight
} from "lucide-react";

export default function Home() {
  const [docUrl, setDocUrl] = useState("");
  const [docText, setDocText] = useState("");
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState(2); // ID of the phase to show

  // Enum like representation of phases to show progress
  const phases = [
    { id: 2, name: "無料版記事", icon: <FileText className="w-5 h-5" /> },
    { id: 3, name: "有料版記事", icon: <FileCheck2 className="w-5 h-5" /> },
    { id: 4, name: "記事結合", icon: <Settings className="w-5 h-5" /> },
    { id: 5, name: "文字校正", icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: 6, name: "Podcast作成", icon: <Mic className="w-5 h-5" /> },
    { id: 7, name: "X投稿文", icon: <Twitter className="w-5 h-5" /> },
  ];

  const handleStart = async () => {
    if (!docText && !docUrl) {
      alert("リサーチ結果のテキスト、またはGoogleドキュメントのURLを入力してください。");
      return;
    }

    // In actual implementation, we might fetch document data here if a URL is provided
    let inputText = docText;
    if (docUrl && !docText) {
      // For demonstration, we just use the URL as context if text is empty
      alert("注意: URLのみが入力された場合、ドキュメントの自動取得にはGoogle Drive連携が必要ですが、今回は直接入力テキストを推奨します。デモとしてURLテキストを前提に進めます。");
      inputText = `参考URL: ${docUrl}`;
    }

    // Load saved prompts
    const saved = localStorage.getItem("app_prompts");
    const customPrompts = saved ? JSON.parse(saved) : {
      phase2: "以下のリサーチ資料（Phase 1）と指定日時「[日付]」を元に、note掲載用の【無料版記事】を作成してください。\\n...",
      phase3: "以下のリサーチ資料と「無料版記事」の続きとして、【有料版記事】を作成してください。\\n...",
      phase4: "無料版と有料版を結合し、全体のフォーマットを整えてください。",
      phase5: "以下の完成原稿について、誤字脱字やトーンマナーを校正してください。",
      phase6: "以下の校正済み原稿を元に、Podcast用のトークスクリプトを作成してください。",
      phase7: "以下の記事内容をプロモーションするためのX（Twitter）投稿文を複数作成してください。"
    };
    const getPrompt = (key: string) => customPrompts[key] || "";

    setIsProcessing(true);
    let currentInput = inputText;
    const resultsRef: { [key: string]: string } = {};

    // Execute sequence 
    try {
      for (let i = 2; i <= 7; i++) {
        setCurrentPhase(i);
        const phaseKey = `phase${i}`;
        const promptText = getPrompt(phaseKey);

        if (!promptText) {
          console.warn(`No prompt specified for phase ${i}, skipping.`);
          continue;
        }

        let inputForPhase = "";

        switch (i) {
          case 2:
            // Phase 2: Needs Phase 1 (inputText)
            inputForPhase = `【元データ（リサーチ結果）】\n${inputText}`;
            break;
          case 3:
            // Phase 3: Needs Phase 1 and Phase 2
            inputForPhase = `【元データ（リサーチ結果）】\n${inputText}\n\n【Phase 2の結果（無料版記事）】\n${resultsRef["phase2"]}`;
            break;
          case 4:
            // Phase 4: Needs Phase 2 and Phase 3
            inputForPhase = `【Phase 2の結果（無料版記事）】\n${resultsRef["phase2"]}\n\n【Phase 3の結果（有料版記事）】\n${resultsRef["phase3"]}`;
            break;
          case 5:
            // Phase 5: Needs Phase 4
            inputForPhase = `【結合済み記事】\n${resultsRef["phase4"]}`;
            break;
          case 6:
            // Phase 6: Needs Phase 5
            inputForPhase = `【完成原稿】\n${resultsRef["phase5"]}`;
            break;
          case 7:
            // Phase 7: Needs Phase 5
            inputForPhase = `【完成原稿】\n${resultsRef["phase5"]}`;
            break;
          default:
            inputForPhase = inputText;
        }

        let retryCount = 0;
        let success = false;
        let data: any = null;

        while (!success && retryCount < 3) {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phase: i,
              input: inputForPhase,
              prompt: promptText,
              date: targetDate
            })
          });

          data = await res.json();

          if (!res.ok) {
            // Check if it's a rate limit (429) or server overload (503) error
            if (data.error && (data.error.includes("429") || data.error.includes("503") || data.error.includes("500"))) {
              const waitTimeMs = data.error.includes("429") ? 45000 : 30000;
              console.warn(`Temporary API Error (429/503) hit on phase ${i}. Waiting ${waitTimeMs / 1000} seconds before retrying...`);
              await new Promise(r => setTimeout(r, waitTimeMs));
              retryCount++;
              continue;
            } else {
              throw new Error(data.error || `Phase ${i} failed`);
            }
          }
          success = true;
        }

        if (!success) {
          throw new Error(`Phase ${i} 呼び出しに複数回失敗しました。`);
        }

        // Store result for next phases
        resultsRef[`phase${i}`] = data.result;
        setResults(prev => ({ ...prev, [`phase${i}`]: data.result }));
        console.log(`Phase ${i} result preview:`, data.result.substring(0, 100));

        // To prevent hitting the 250k TPM limit, add a longer 10s delay between successful phases
        if (i < 7) {
          await new Promise(r => setTimeout(r, 10000));
        }
      }

      // Final result saving logic here if needed
      alert("全フェーズの生成が完了しました！下部の「生成完了」から結果をご確認ください。");
    } catch (err: any) {
      alert("生成中にエラーが発生しました: " + err.message);
      console.error(err);
    }

    setIsProcessing(false);
    setCurrentPhase(8); // Complete
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 pb-24 font-sans selection:bg-teal-500/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-600 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Auto Article</h1>
        </div>
        <Link href="/settings" className="p-2 -mr-2 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white">
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      <main className="px-6 py-8 max-w-md mx-auto space-y-8">

        {/* Step 1: Input Deep Research */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">1</span>
            <h2 className="text-lg font-semibold">リサーチ結果の入力</h2>
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            手動で実行したDeep Researchの結果（Phase 1）を貼り付けてください。ドキュメントURLでも可能です。
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
            <textarea
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="リサーチ結果のテキストをここにペースト..."
              className="w-full h-32 bg-transparent text-neutral-200 placeholder:text-neutral-600 outline-none resize-none p-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-neutral-800 flex-1"></div>
            <span className="text-xs text-neutral-500 font-medium">OR</span>
            <div className="h-px bg-neutral-800 flex-1"></div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-neutral-500" />
            </div>
            <input
              type="url"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-900 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 sm:text-sm transition-all"
              placeholder="GoogleドキュメントのURL"
            />
          </div>
        </section>

        {/* Step 2: Date Setup */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">2</span>
            <h2 className="text-lg font-semibold">変数の設定</h2>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-neutral-500" />
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-900 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 sm:text-sm transition-all"
            />
          </div>
          <p className="text-xs text-neutral-500">
            ※ 上記の日付がプロンプト内の [日付] に自動変換されます。
          </p>
        </section>

        {/* Progress Preview */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-neutral-400">実行フェーズ (自動化)</h3>
          <div className="space-y-3">
            {phases.map((phase, index) => {
              const isActive = currentPhase === phase.id;
              const isPast = currentPhase > phase.id;

              return (
                <div id={`phase-\${phase.id}`} key={phase.id} className={`flex items-center gap-3 \${isPast ? 'opacity-50' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center \${
                    isActive ? 'bg-teal-500 text-white animate-pulse' : 
                    isPast ? 'bg-teal-500/20 text-teal-500' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                      isPast ? <CheckCircle2 className="w-4 h-4" /> : phase.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium \${isActive ? 'text-teal-400' : isPast ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Phase {phase.id}: {phase.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Results UI */}
        {currentPhase === 8 && Object.keys(results).length > 0 && (
          <section id="results-section" className="space-y-4 pt-4 border-t border-neutral-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg font-bold text-teal-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              生成完了
            </h2>

            {/* Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 snap-x scrollbar-hide">
              {phases.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => setActiveTab(phase.id)}
                  className={`shrink-0 snap-start px-4 py-2 rounded-xl text-sm font-medium transition-all \${
                     activeTab === phase.id 
                     ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                     : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                   }`}
                >
                  Phase {phase.id}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-neutral-300">
                  {phases.find(p => p.id === activeTab)?.name}
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(results[`phase${activeTab}`] || "");
                  }}
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  コピー
                </button>
              </div>
              <div className="bg-neutral-950 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {results[`phase${activeTab}`] || "生成データがありません"}
                </pre>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Floating Run Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent">
        {currentPhase === 8 ? (
          <div className="flex gap-3 w-full max-w-md mx-auto">
            <button
              onClick={() => {
                document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white py-4 rounded-2xl font-bold shadow-lg shadow-teal-500/25 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>結果を見る</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm("現在の結果は消去されますが、最初から生成し直しますか？")) {
                  handleStart();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4" />
              <span>再生成</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white py-4 rounded-2xl font-bold shadow-lg shadow-teal-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>自動生成を実行中...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>全フェーズを自動生成</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
