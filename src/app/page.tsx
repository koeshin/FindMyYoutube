"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, FileText, Youtube, Menu, Bookmark, X, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import VideoCard, { VideoResult } from "@/components/VideoCard";
import HistorySidebar from "@/components/HistorySidebar";

// Simplified API Response
interface ResearchResponse {
  status: "success" | "ambiguous" | "error";
  videos?: VideoResult[];
  report?: string;
  message?: string;
  candidates?: VideoResult[]; // for fallback
}

export default function Home() {
  // Core State
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [data, setData] = useState<ResearchResponse | null>(null);

  // Persistence State
  const [savedVideos, setSavedVideos] = useState<VideoResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<"videos" | "report" | "saved">("videos");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load Persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem("findmyyoutube_saved");
      const hist = localStorage.getItem("findmyyoutube_history");

      if (saved) setSavedVideos(JSON.parse(saved));
      if (hist) setHistory(JSON.parse(hist));
    } catch (e) {
      console.error("Failed to load persistence", e);
    }
  }, []);

  // Save Persistence Changes
  useEffect(() => {
    localStorage.setItem("findmyyoutube_saved", JSON.stringify(savedVideos));
  }, [savedVideos]);

  useEffect(() => {
    localStorage.setItem("findmyyoutube_history", JSON.stringify(history));
  }, [history]);

  const handleSubmit = async (e?: React.FormEvent, overrideTopic?: string) => {
    if (e) e.preventDefault();
    const searchTopic = overrideTopic || topic;
    if (!searchTopic.trim()) return;

    // Update History (Functions as a Set)
    setHistory(prev => {
      const newHist = [searchTopic, ...prev.filter(h => h !== searchTopic)].slice(0, 20);
      return newHist;
    });

    setTopic(searchTopic);
    setLoading(true);
    setActiveTab("videos");
    setData(null);

    try {
      setStatusText("🔍 Searching YouTube & Fetching Transcripts...");
      // Simulate progress for UX
      setTimeout(() => setStatusText("🧠 Filtering by 'Presence' ..."), 5000);
      setTimeout(() => setStatusText("✨ AI Summarizing Top Results..."), 12000);

      // Extract saved channels for personalization
      const savedChannels = Array.from(new Set(savedVideos.map(v => v.channel)));

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: searchTopic,
          savedChannels
        }),
      });

      const result = await response.json();
      setData(result);
    } catch (error: any) {
      alert(`Research Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm("Start a new search? Current results will be cleared.")) {
      setData(null);
      setTopic("");
    }
  };

  const toggleSave = (video: VideoResult) => {
    setSavedVideos(prev => {
      const exists = prev.find(v => v.id === video.id);
      if (exists) {
        return prev.filter(v => v.id !== video.id);
      } else {
        return [video, ...prev];
      }
    });
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-red-900 selection:text-white flex overflow-hidden">

      {/* Sidebar */}
      <HistorySidebar
        history={history}
        onSelect={(t) => handleSubmit(undefined, t)}
        onClear={() => setHistory([])}
        isOpen={sidebarOpen}
      />

      {/* Main Layout */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 relative ${sidebarOpen ? 'md:ml-72' : 'ml-0'}`}>

        {/* Top Navigation / Search Bar */}
        <header className={`w-full sticky top-0 z-40 border-b border-gray-800 bg-black/80 backdrop-blur-md transition-all`}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">

            <div className="flex items-center gap-6">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <Menu size={20} />
              </button>

              <div onClick={handleClear} className="flex items-center gap-2 cursor-pointer group">
                <div className="bg-red-600 rounded-lg p-1.5 group-hover:shadow-lg group-hover:shadow-red-900/50 transition-all">
                  <Youtube size={20} className="text-white fill-current" />
                </div>
                <span className="font-bold text-lg tracking-tight hidden sm:block">
                  FindMy<span className="text-red-500">YouTube</span>
                </span>
              </div>
            </div>

            {/* Search Bar - Compact when has data, Large when empty logic handled by layout below. 
                Actually, let's keep it persistent in header for better UX 
            */}
            <form onSubmit={(e) => handleSubmit(e)} className="flex-1 max-w-xl mx-4">
              <div className="relative group">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-full py-2 pl-4 pr-12 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  placeholder="Search for videos (e.g., 'AX 현직자')..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="absolute right-1 top-1 bottom-1 bg-red-600 hover:bg-red-700 text-white px-3 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                </button>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("saved")}
                className={`relative p-2 rounded-lg transition-colors ${activeTab === 'saved' ? 'text-red-500 bg-white/10' : 'text-gray-400 hover:text-white'}`}
              >
                <Bookmark size={20} />
                {savedVideos.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* Start Screen */}
          {!data && !loading && savedVideos.length === 0 && (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/50 mb-4">
                <Youtube size={48} className="text-white fill-current" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">
                FindMy<span className="text-red-500">YouTube</span>
              </h1>
              <p className="text-xl text-gray-400 font-light leading-relaxed">
                Precision Search with <span className="text-white font-medium">Transcript Verification</span>. <br />
                Filters out noise. Boosts your saved channels.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && !data && (
            <div className="h-[70vh] flex flex-col items-center justify-center">
              <div className="flex flex-col items-center mb-8 animate-pulse">
                <Youtube size={64} className="text-red-500 mb-4 fill-current" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Deep Searching...</h2>
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

          {/* ERROR / AMBIGUOUS STATE */}
          {data?.status === 'ambiguous' && (
            <div className="max-w-3xl mx-auto mt-10 animate-in fade-in">
              <div className="bg-[#1a1a1a] border border-yellow-800/50 p-8 rounded-3xl text-center">
                <div className="inline-flex p-3 bg-yellow-900/20 rounded-full mb-4">
                  <AlertTriangle size={32} className="text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Search results are ambiguous</h2>
                <p className="text-gray-400 mb-6 text-lg">{data.message}</p>

                <div className="text-sm text-gray-500 mb-8">
                  We found {data.candidates?.length} potential videos, but none met the strict keyword criteria.
                  <br />Try searching for <strong>"{topic} Lecture"</strong> or <strong>"{topic} Tutorial"</strong> instead.
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => handleSubmit(undefined, topic + " Lecture")}
                    className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    Try "{topic} Lecture"
                  </button>
                  <button
                    onClick={() => handleSubmit(undefined, topic + " Tutorial")}
                    className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    Try "{topic} Tutorial"
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Results */}
          {((data?.status === 'success' && !loading) || activeTab === 'saved') && (
            <div className="max-w-7xl mx-auto">
              {/* Tab Navigation */}
              <div className="flex justify-center mb-8 sticky top-0 z-30 pt-4 pb-2 bg-gradient-to-b from-black via-black to-transparent">
                <nav className="flex space-x-1 bg-[#1a1a1a] p-1 rounded-full border border-gray-800 shadow-2xl">
                  <button
                    onClick={() => setActiveTab("videos")}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'videos' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Verified Videos <span className="ml-1 opacity-70">({data?.videos?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("report")}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'report' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Report
                  </button>
                  <button
                    onClick={() => setActiveTab("saved")}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Saved <span className="ml-1 opacity-70">({savedVideos.length})</span>
                  </button>
                </nav>
              </div>

              <div className="animate-in slide-in-from-bottom-5 fade-in duration-500">
                {/* Tab 1: VIDEOS */}
                {activeTab === "videos" && data?.videos && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.videos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isSaved={savedVideos.some(v => v.id === video.id)}
                        onToggleSave={toggleSave}
                      />
                    ))}
                  </div>
                )}

                {/* Tab 2: REPORT */}
                {activeTab === "report" && (
                  <div className="max-w-4xl mx-auto bg-[#111] border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-5">
                    <div className="prose prose-invert prose-red max-w-none">
                      {data?.report ? (
                        <ReactMarkdown>{data.report}</ReactMarkdown>
                      ) : (
                        <div className="text-center py-20 text-gray-500">
                          <FileText size={48} className="mx-auto mb-4 opacity-50" />
                          <p className="text-xl">No report generated for this search.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: SAVED */}
                {activeTab === "saved" && (
                  savedVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedVideos.map((video) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          isSaved={true}
                          onToggleSave={toggleSave}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      <Bookmark size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-xl">No saved videos yet.</p>
                      <button onClick={() => setActiveTab("videos")} className="text-red-500 hover:underline mt-2">Go find some!</button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
