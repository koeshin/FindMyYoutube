"use client";

import { useState } from "react";
import { Search, Loader2, FileText, Youtube, PlayCircle, ExternalLink, Bot, Sparkles } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "videos">("report");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setData(null);
    setActiveTab("report");

    try {
      setStatusText("🧠 Analyzing Topic & Planning...");
      setTimeout(() => setStatusText("🌏 Deep Searching Web & YouTube..."), 2500);
      setTimeout(() => setStatusText("📝 Synthesizing Report & Curating Videos..."), 8000);

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
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
    <main className="min-h-screen bg-black text-white font-sans selection:bg-red-900 selection:text-white">

      {/* 
        Hero / Search Section 
        - Centered vertically if no data
        - Top bar if data exists
      */}
      <div className={`w-full transition-all duration-500 ${data ? 'border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-40' : 'min-h-screen flex flex-col justify-center items-center'}`}>
        <div className={`container mx-auto px-4 ${data ? 'py-4 flex flex-col md:flex-row items-center gap-4' : 'text-center max-w-2xl'}`}>

          {/* Logo Group */}
          <div className={`flex items-center gap-2 ${data ? 'mr-6' : 'flex-col mb-8 gap-4'}`}>
            <div className={`relative flex items-center justify-center bg-red-600 rounded-xl ${data ? 'w-10 h-10' : 'w-20 h-20 shadow-2xl shadow-red-900/50'}`}>
              <Youtube size={data ? 20 : 40} className="text-white fill-current" />
            </div>
            <h1 className={`font-bold tracking-tighter ${data ? 'text-xl' : 'text-5xl md:text-6xl'}`}>
              FindMy<span className="text-red-500">YouTube</span>
            </h1>
            {!data && <p className="text-gray-400 text-lg md:text-xl font-light">Deep Research Agent & Curator</p>}
          </div>

          {/* Search Input Group */}
          <form onSubmit={handleSubmit} className={`relative flex-1 ${data ? 'w-full max-w-2xl' : 'w-full mt-8'}`}>
            <div className="relative group">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={`w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-900 transition-all placeholder-gray-500
                        ${data ? 'py-2.5 pl-10 pr-4 text-sm' : 'py-4 pl-14 pr-16 text-lg shadow-lg'}`}
                placeholder={data ? "Search new topic..." : "What do you want to research?"}
                disabled={loading}
              />
              <Search className={`absolute text-gray-400 ${data ? 'left-3 top-2.5 w-4 h-4' : 'left-5 top-4.5 w-6 h-6'}`} />

              {!data && (
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="absolute right-2 top-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Loading Overlay (Only when initial loading) */}
      {loading && !data && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8 animate-pulse">
            <Youtube size={64} className="text-red-500 mb-4 fill-current" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Researching...</h2>
          </div>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="animate-spin text-red-500" size={24} />
              <span className="text-gray-300 font-medium">{statusText}</span>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 animate-progressBar rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Results Content */}
      {data && !loading && (
        <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">

          {/* Tab Navigation */}
          <div className="flex justify-center mb-10">
            <nav className="flex space-x-2 bg-[#1a1a1a] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'report'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <FileText size={18} className="mr-2" />
                Report
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'videos'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Youtube size={18} className="mr-2" />
                Videos
                <span className="ml-2 bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {data.videos.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="max-w-6xl mx-auto min-h-[50vh]">

            {/* Tab 1: Research Report */}
            {activeTab === "report" && (
              <article className="bg-[#111] border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="prose prose-invert prose-lg max-w-none 
                            prose-headings:font-bold prose-h1:text-3xl prose-h2:text-white prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                            prose-h3:text-gray-200 prose-h3:text-xl
                            prose-p:text-gray-400 prose-p:leading-relaxed
                            prose-li:text-gray-400
                            prose-strong:text-white
                            prose-a:text-red-400 prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:border-l-4 prose-blockquote:border-red-600 prose-blockquote:bg-gray-900/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic
                        ">
                  <ReactMarkdown>{data.report}</ReactMarkdown>
                </div>
              </article>
            )}

            {/* Tab 2: Curated Videos */}
            {activeTab === "videos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                {data.videos.map((video) => (
                  <div key={video.id} className="group bg-[#111] border border-gray-800 rounded-2xl overflow-hidden hover:border-red-600/50 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl shadow-black/50">
                    {/* Thumbnail Section */}
                    <div className="relative aspect-video bg-gray-900 group-hover:scale-[1.02] transition-transform duration-500 origin-center">
                      {video.thumbnail && (
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded border border-white/10">
                        {video.duration}
                      </span>
                      <a href={video.url} target="_blank" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[1px]">
                        <PlayCircle size={48} className="text-white drop-shadow-xl" fill="currentColor" />
                      </a>
                    </div>

                    {/* Info Section */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-red-500 transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white overflow-hidden">
                            {video.channel[0]}
                          </div>
                          <span>{video.channel}</span>
                        </div>
                        <span>{video.uploadedAt}</span>
                      </div>
                      <a href={video.url} target="_blank" className="block w-full text-center py-2 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                        Open Video
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
