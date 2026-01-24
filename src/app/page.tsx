"use client";

import { useState } from "react";
import { Search, Loader2, FileText, Video, PlayCircle, ExternalLink, Bot, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

interface VideoResult {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  channel: string;
  views: number;
  uploadedAt: string;
}

interface ResearchResponse {
  report: string;
  videos: VideoResult[];
  debug_plan: any;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState(""); // Planner -> Searcher -> Writer

  const [data, setData] = useState<ResearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "videos">("report");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setData(null);
    setActiveTab("report");

    try {
      // Mocking progress steps for UI feedback (Real progress comes from API response usually, 
      // but for this MVP we simulate specific milestones before the long wait resolves)
      setStatusText("🤖 Phase 1: Planning Research Strategy...");
      setTimeout(() => setStatusText("🔎 Phase 2: Searching Deep Web & YouTube..."), 2500);
      setTimeout(() => setStatusText("✍️ Phase 3: Analyzing & Writing Comprehensive Report..."), 8000);

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tavilyKey: tavilyKey.trim() || undefined }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setData(result);
    } catch (error: any) {
      alert(`Research Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container max-w-5xl mx-auto px-4 py-8">
      <header className="text-center mb-10">
        <div className="inline-flex items-center justify-center bg-gray-900/50 p-4 rounded-3xl border border-gray-800 mb-4">
          <Bot size={40} className="text-blue-500 mr-4" />
          <div className="text-left">
            <h1 className="text-3xl font-bold m-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Deep Research Agent
            </h1>
            <p className="text-gray-400 text-sm m-0">Gemini 1.5 Pro + Tavily + YouTube</p>
          </div>
        </div>
      </header>

      {/* Search Input Section */}
      {!data && !loading && (
        <section className="max-w-2xl mx-auto bg-gray-900/40 p-8 rounded-2xl border border-gray-800 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Research Topic</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Current State of Quantum Computing Market"
                  required
                />
              </div>
            </div>

            {/* Optional Tavily Key Input for User */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tavily API Key (Optional if configured in env)</label>
              <input
                value={tavilyKey}
                type="password"
                onChange={(e) => setTavilyKey(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none"
                placeholder="tvly-..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/20"
            >
              Start Deep Research
            </button>
          </form>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <section className="max-w-xl mx-auto text-center py-20">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold animate-pulse">{statusText}</h2>
          <p className="text-gray-500 mt-2 text-sm">This process takes about 30-60 seconds for deep analysis.</p>
        </section>
      )}

      {/* Results View */}
      {data && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header / Tabs */}
          <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-xl font-semibold truncate max-w-md">Results: {topic}</h2>
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'report' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText size={16} className="mr-2" />
                Research Report
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'videos' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Video size={16} className="mr-2" />
                Related Videos ({data.videos.length})
              </button>
            </div>
          </div>

          {/* Tab 1: Report */}
          {activeTab === "report" && (
            <article className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
              <div className="prose prose-invert max-w-none prose-headings:text-blue-100 prose-a:text-blue-400 prose-strong:text-white">
                <ReactMarkdown>{data.report}</ReactMarkdown>
              </div>
            </article>
          )}

          {/* Tab 2: Videos */}
          {activeTab === "videos" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.videos.map((video) => (
                <div key={video.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all group">
                  <div className="relative aspect-video bg-gray-800">
                    {video.thumbnail && (
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono">{video.duration}</div>
                    <a href={video.url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle size={48} className="text-white drop-shadow-lg" />
                    </a>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2 leading-tight h-10">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{video.channel}</span>
                      <span>{video.uploadedAt}</span>
                    </div>
                    <a href={video.url} target="_blank" className="mt-4 block w-full text-center bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                      Watch Video
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </main>
  );
}
