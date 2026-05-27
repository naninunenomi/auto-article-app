"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from 'next/link';
import {
  FileText, Calendar, Play, Settings, CheckCircle2,
  Loader2, FileCheck2, Mic, Twitter, Search, Hash, AlignLeft
} from "lucide-react";

type PatternType = 'news' | 'keyword_current' | 'keyword_biz';

export default function Home() {
  const [pattern, setPattern] = useState<PatternType>('news');
  
  // Inputs
  const [newsText, setNewsText] = useState("");
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [keyword, setKeyword] = useState("");
  const [description, setDescription] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState(1);
  const [appPrompts, setAppPrompts] = useState<Record<string, Record<string, string>>>({});

  const downloadTxt = (filename: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getPhases = (pat: PatternType) => {
    if (pat === 'news') {
      return [
        { id: 1, name: "Deep Research", icon: <Search className="w-5 h-5" /> },
        { id: 2, name: "無料版記事", icon: <FileText className="w-5 h-5" /> },
        { id: 3, name: "有料版記事", icon: <FileCheck2 className="w-5 h-5" /> },
        { id: 4, name: "記事結合", icon: <Settings className="w-5 h-5" /> },
        { id: 5, name: "note用修正", icon: <CheckCircle2 className="w-5 h-5" /> },
        { id: 6, name: "X投稿文", icon: <Twitter className="w-5 h-5" /> },
        { id: 7, name: "Podcast", icon: <Mic className="w-5 h-5" /> },
      ];
    } else {
      return [
        { id: 1, name: "Deep Research＆無料版", icon: <Search className="w-5 h-5" /> },
        { id: 2, name: "有料版記事", icon: <FileCheck2 className="w-5 h-5" /> },
        { id: 3, name: "結合＆note用修正", icon: <CheckCircle2 className="w-5 h-5" /> },
        { id: 4, name: "X投稿文", icon: <Twitter className="w-5 h-5" /> },
        { id: 5, name: "Podcast", icon: <Mic className="w-5 h-5" /> },
      ];
    }
  };

  const phases = getPhases(pattern);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch("/api/results", { cache: "no-store" });
        const data = await res.json();
        if (data.results && Object.keys(data.results).length > 0) {
          setResults(data.results);
          setCurrentPhase(10); 
        }
      } catch (err) {
        console.error("Failed to load last results", err);
      }
    };
    fetchResults();
  }, []);

  const handleStart = async () => {
    if (pattern === 'news' && !newsText) {
      alert("ピックアップニュースのテキストを入力してください。");
      return;
    }
    if (pattern !== 'news' && !keyword) {
      alert("キーワードを入力してください。");
      return;
    }

    let customPrompts: Record<string, Record<string, string>> = {};
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.prompts && data.prompts.news) {
        customPrompts = data.prompts;
      } else {
        alert("プロンプト設定が読み込めませんでした。設定画面で保存してください。");
        return;
      }
    } catch (e) {
      console.error("Failed to load prompts from API", e);
      alert("プロンプト設定の読み込みに失敗しました。");
      return;
    }
    setAppPrompts(customPrompts);

    const patPrompts = customPrompts[pattern] || {};
    const getPrompt = (key: string) => patPrompts[key] || "";

    setIsProcessing(true);
    const resultsRef: { [key: string]: string } = {};

    try {
      const numPhases = pattern === 'news' ? 7 : 5;
      
      for (let i = 1; i <= numPhases; i++) {
        setCurrentPhase(i);
        const phaseKey = `phase${i}`;
        const promptText = getPrompt(phaseKey);
        
        if (!promptText && (pattern !== 'news' || i !== 4)) { // Phase 4 in news is programmatic
           throw new Error(`Phase ${i} のプロンプトが設定されていません。`);
        }

        let inputForPhase = "";
        
        if (pattern === 'news') {
          switch (i) {
            case 1:
              inputForPhase = `【ピックアップニュース】\n${newsText}`;
              break;
            case 2:
              inputForPhase = `【リサーチ結果】\n${resultsRef["phase1"]}`;
              break;
            case 3:
              inputForPhase = `【リサーチ結果】\n${resultsRef["phase1"]}\n\n【無料版記事】\n${resultsRef["phase2"]}`;
              break;
            case 4:
              inputForPhase = `【無料版記事】\n${resultsRef["phase2"]}\n\n【有料版記事】\n${resultsRef["phase3"]}`;
              break; 
            case 5:
              inputForPhase = `【結合済み記事】\n${resultsRef["phase4"]}`;
              break;
            case 6:
            case 7:
              inputForPhase = `【完成原稿】\n${resultsRef["phase5"]}`;
              break;
          }
        } else {
          switch (i) {
            case 1:
              inputForPhase = `【キーワード】\n${keyword}\n\n【補足説明文】\n${description}`;
              break;
            case 2:
              inputForPhase = `【リサーチ結果＆無料版記事】\n${resultsRef["phase1"]}`;
              break;
            case 3:
              inputForPhase = `【無料版記事】\n${resultsRef["phase1"]}\n\n【有料版記事】\n${resultsRef["phase2"]}`;
              break;
            case 4:
            case 5:
              inputForPhase = `【完成原稿】\n${resultsRef["phase3"]}`;
              break;
          }
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
              pattern: pattern,
              input: inputForPhase,
              prompt: promptText,
              date: targetDate
            })
          });

          data = await res.json();

          if (!res.ok) {
            const isTransient = res.status === 429 || res.status === 503 || res.status === 504 || res.status === 500;
            if (isTransient && retryCount < 2) {
              const waitTimeMs = res.status === 429 ? 60000 : 30000;
              console.warn(`Temporary Error (${res.status}) on phase ${i}. Waiting ${waitTimeMs / 1000}s...`);
              await new Promise(r => setTimeout(r, waitTimeMs));
              retryCount++;
              continue;
            } else {
              throw new Error(`[Phase ${i}] ${data.error || `Status ${res.status}`}`);
            }
          }
          success = true;
          resultsRef[`phase${i}`] = data.result;
          setResults(prev => ({ ...prev, [`phase${i}`]: data.result }));
        }

        if (!success) {
          throw new Error(`Phase ${i} 呼び出しに複数回失敗しました。`);
        }

        console.log(`Phase ${i} completed.`);
        await new Promise(r => setTimeout(r, 8000));
      }

      try {
        await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: resultsRef })
        });
      } catch (err) {
        console.error("Failed to save results to KV", err);
      }

      alert("全フェーズの生成が完了しました！");
      setActiveTab(pattern === 'news' ? 5 : 3);
    } catch (err: any) {
      alert("生成中にエラーが発生しました: " + err.message);
      console.error(err);
    }

    setIsProcessing(false);
    setCurrentPhase(10); 
  };

  const currentPatternPrompts = appPrompts[pattern] || {};

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 pb-24 font-sans selection:bg-teal-500/30">
      <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-600 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Auto Article V6</h1>
        </div>
        <Link href="/settings" className="p-2 -mr-2 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white">
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      <main className="px-6 py-8 max-w-md mx-auto space-y-8">

        {/* Pattern Selector */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">1</span>
            <h2 className="text-lg font-semibold">パターンの選択</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'news', label: '📰 ニュースパターン' },
              { id: 'keyword_current', label: '🌐 時事キーワードパターン' },
              { id: 'keyword_biz', label: '💼 お勉強（ビジネス用語）パターン' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => { setPattern(p.id as PatternType); setResults({}); setCurrentPhase(0); }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  pattern === p.id 
                  ? 'bg-teal-500/10 border-teal-500/50 text-teal-400' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-sm">{p.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Inputs based on pattern */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">2</span>
            <h2 className="text-lg font-semibold">インプット情報</h2>
          </div>
          
          {pattern === 'news' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
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
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
                <textarea
                  value={newsText}
                  onChange={(e) => setNewsText(e.target.value)}
                  placeholder="ピックアップニュースのテキストをペースト..."
                  className="w-full h-32 bg-transparent text-neutral-200 placeholder:text-neutral-600 outline-none resize-none p-3 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="キーワードを入力..."
                  className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-900 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 sm:text-sm transition-all"
                />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="補足説明文をペースト..."
                  className="w-full h-32 bg-transparent text-neutral-200 placeholder:text-neutral-600 outline-none resize-none p-3 text-sm"
                />
              </div>
            </div>
          )}
        </section>

        {/* Progress Preview */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-neutral-400">自動化ワークフロー</h3>
          <div className="space-y-3">
            {phases.map((phase) => {
              const isActive = currentPhase === phase.id;
              const isPast = currentPhase > phase.id;

              return (
                <div key={phase.id} className={`flex items-center gap-3 ${isPast ? 'opacity-50' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-teal-500 text-white animate-pulse' : 
                    isPast ? 'bg-teal-500/20 text-teal-500' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                      isPast ? <CheckCircle2 className="w-4 h-4" /> : phase.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? 'text-teal-400' : isPast ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Phase {phase.id}: {phase.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Results UI */}
        {currentPhase === 10 && Object.keys(results).length > 0 && (
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
                  className={`shrink-0 snap-start px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                     activeTab === phase.id 
                     ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                     : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                   }`}
                >
                  {phase.name}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-neutral-300">
                  {phases.find(p => p.id === activeTab)?.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(results[`phase${activeTab}`] || "");
                      alert("コピーしました");
                    }}
                    className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    コピー
                  </button>
                </div>
              </div>

              {((pattern === 'news' && activeTab === 5) || (pattern !== 'news' && activeTab === 3)) && (
                <div className="mb-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl space-y-2">
                  <p className="text-xs text-teal-400 font-medium">✨ NotebookLM連携 (音声用)</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const prompt = currentPatternPrompts["notebookLM_A"] || "ポッドキャスト音声を作成してください。";
                        const text = results[`phase${activeTab}`] || "";
                        navigator.clipboard.writeText(`【指示】\n${prompt}\n\n【原稿】\n${text}`);
                        alert("NotebookLM用プロンプトAと原稿をセットでコピーしました！");
                      }}
                      className="flex-1 text-xs bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 px-3 py-2 rounded-lg transition-colors font-medium text-center"
                    >
                      🎙️ 音声用Aをコピー
                    </button>
                    <button
                      onClick={() => {
                        const prompt = currentPatternPrompts["notebookLM_B"] || "要約音声を作成してください。";
                        const text = results[`phase${activeTab}`] || "";
                        navigator.clipboard.writeText(`【指示】\n${prompt}\n\n【原稿】\n${text}`);
                        alert("NotebookLM用プロンプトBと原稿をセットでコピーしました！");
                      }}
                      className="flex-1 text-xs bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 px-3 py-2 rounded-lg transition-colors font-medium text-center"
                    >
                      🎙️ 音声用Bをコピー
                    </button>
                  </div>
                </div>
              )}
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
        {currentPhase === 10 ? (
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
