"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayCircle, Bookmark, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

export interface VideoResult {
    id: string;
    title: string;
    url: string;
    duration: string;
    thumbnail: string;
    channel: string;
    views: number;
    uploadedAt: string;
    // New fields for batch analysis
    transcript?: string;
    analysis?: {
        subtitle: string;
        summary: string[];
    } | null;
    reasoning?: string;
}

interface VideoCardProps {
    video: VideoResult;
    isSaved: boolean;
    onToggleSave: (video: VideoResult) => void;
}

export default function VideoCard({ video, isSaved, onToggleSave }: VideoCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Analysis is now pre-fetched by the batch API
    const analysis = video.analysis;

    return (
        <div className="group relative bg-[#111] border border-gray-800 hover:border-red-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-red-900/10 flex flex-col h-full">
            {/* ... (thumbnail section remains same) ... */}
            <div className="relative aspect-video bg-gray-900 overflow-hidden">
                {video.thumbnail && (
                    <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                    {video.duration}
                </span>

                {/* Reasoning Badge (Precision/Personalization) */}
                {video.reasoning && (
                    <span className="absolute top-2 left-2 bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md uppercase tracking-wide shadow-lg">
                        {video.reasoning}
                    </span>
                )}

                {/* Action Buttons overlay */}
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Critical Fix
                            onToggleSave(video);
                        }}
                        className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 ${isSaved
                            ? "bg-red-600/90 text-white shadow-lg shadow-red-500/30"
                            : "bg-black/40 text-gray-300 hover:bg-black/60 hover:text-white"
                            }`}
                    >
                        {isSaved ? <Check size={16} strokeWidth={3} /> : <Bookmark size={16} />}
                    </button>
                </div>

                <a
                    href={video.url}
                    target="_blank"
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                >
                    <div className="bg-red-600/90 text-white p-4 rounded-full shadow-2xl backdrop-blur-sm transform group-hover:scale-110 transition-transform">
                        <PlayCircle size={32} fill="currentColor" />
                    </div>
                </a>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                {/* Header content */}
                <div className="mb-4">
                    <h3 className="text-white font-bold text-lg leading-snug line-clamp-2 mb-2 group-hover:text-red-400 transition-colors">
                        {video.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-300 font-bold border border-gray-700">
                                {video.channel[0]}
                            </div>
                            <span>{video.channel}</span>
                        </div>
                        <span>{video.uploadedAt}</span>
                    </div>
                </div>

                {/* AI Analysis Section (Pre-loaded) */}
                <div className="mt-auto pt-4 border-t border-gray-800/50">
                    {analysis ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Subtitle - News Headline Style */}
                            <div className="flex items-start gap-2 mb-3">
                                <Sparkles size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                <p className="text-sm font-semibold text-gray-200 leading-relaxed italic">
                                    "{analysis.subtitle}"
                                </p>
                            </div>

                            {/* Summary - Expandable */}
                            <div className={`relative overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[500px]' : 'max-h-[80px]'}`}>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    {analysis.summary.map((point, idx) => {
                                        const [core, ...rest] = point.split('. ');
                                        return (
                                            <li key={idx} className="flex gap-2">
                                                <span className="text-red-500/50 mt-1.5">•</span>
                                                <span>
                                                    <strong className="text-gray-300">{core}.</strong> {rest.join('. ')}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {/* Gradient mask when collapsed */}
                                {!expanded && (
                                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#111] to-transparent"></div>
                                )}
                            </div>

                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="w-full mt-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-white transition-colors py-2 hover:bg-white/5 rounded-lg"
                            >
                                {expanded ? (
                                    <>Show Less <ChevronUp size={12} /></>
                                ) : (
                                    <>Read Analysis <ChevronDown size={12} /></>
                                )}
                            </button>
                        </div>
                    ) : (
                        video.transcript && video.transcript.length > 0 ? (
                            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 p-2 rounded-lg border border-red-900/30">
                                <AlertTriangle size={14} />
                                <span>AI Disconnected (Limit Reached)</span>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-600 italic">Analysis unavailable (No transcript)</p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper needed for the icon
import { AlertTriangle } from "lucide-react";
