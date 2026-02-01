"use client";

import { History, Trash2, Search } from "lucide-react";

interface HistorySidebarProps {
    history: string[];
    onSelect: (topic: string) => void;
    onClear: () => void;
    isOpen: boolean;
}

export default function HistorySidebar({ history, onSelect, onClear, isOpen }: HistorySidebarProps) {
    if (!isOpen) return null;

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0a] border-r border-gray-800 p-6 z-30 transition-transform transform md:translate-x-0 pt-24 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                    <History size={14} />
                    Recent Research
                </h3>
                {history.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                        title="Clear History"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {history.length === 0 ? (
                    <p className="text-gray-700 text-sm italic">No history yet.</p>
                ) : (
                    history.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => onSelect(item)}
                            className="w-full text-left px-4 py-3 rounded-xl bg-gray-900/50 hover:bg-gray-800 text-gray-300 hover:text-white text-sm transition-all group flex items-start gap-3 border border-transparent hover:border-gray-700"
                        >
                            <Search size={14} className="mt-1 text-gray-600 group-hover:text-red-500 transition-colors" />
                            <span className="line-clamp-2">{item}</span>
                        </button>
                    ))
                )}
            </div>
        </aside>
    );
}
