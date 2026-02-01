import { tavily } from "@tavily/core";
import YouTube from "youtube-sr";
import { VideoResult } from "@/lib/youtube";

// Explicitly use the key from env if not passed automatically, 
// though standard SDK might look for process.env.TAVILY_API_KEY
const getClient = () => tavily({ apiKey: process.env.TAVILY_API_KEY });

function extractVideoId(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) {
            return u.searchParams.get("v");
        } else if (u.hostname.includes("youtu.be")) {
            return u.pathname.slice(1);
        }
    } catch (e) { }
    return null;
}

export async function searchTavilyVideos(topic: string, limit: number = 20): Promise<VideoResult[]> {
    try {
        const tv = getClient();
        console.log(`[Tavily] Searching for: site:youtube.com ${topic}`);

        const response = await tv.search(`site:youtube.com ${topic}`, {
            maxResults: Math.min(limit + 5, 20), // Tavily max is often 20 for basic
            includeDomains: ["youtube.com"],
            searchDepth: "basic",
        });

        const distinctIds = new Set<string>();
        response.results.forEach(r => {
            const id = extractVideoId(r.url);
            if (id) distinctIds.add(id);
        });

        const videoIds = Array.from(distinctIds);
        console.log(`[Tavily] Found ${videoIds.length} video links. Fetching metadata...`);

        // Fetch metadata in parallel
        // We set a timeout for each fetch so one slow request doesn't block everything
        const videoPromises = videoIds.map(async (id) => {
            try {
                // Fetch video details
                const v = await YouTube.getVideo(`https://www.youtube.com/watch?v=${id}`);

                if (!v || !v.title) return null;

                return {
                    id: v.id || id,
                    title: v.title,
                    url: `https://www.youtube.com/watch?v=${v.id || id}`,
                    duration: v.durationFormatted || "0:00",
                    thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                    channel: v.channel?.name || "Unknown Channel",
                    views: v.views || 0,
                    uploadedAt: v.uploadedAt || "", // might be formatted date
                    // We don't have exact Date object easily unless we parse, 
                    // but for Tavily search we usually trust Google's ranking over date sorting
                    uploadedDate: new Date()
                } as VideoResult;
            } catch (e) {
                console.warn(`[Tavily] Failed to fetch metadata for ${id}`);
                return null;
            }
        });

        const videos = await Promise.all(videoPromises);
        return videos.filter((v): v is VideoResult => v !== null);

    } catch (error) {
        console.error("Tavily Search Error:", error);
        return [];
    }
}
