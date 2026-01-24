import YouTube from "youtube-sr";
import { YoutubeTranscript } from "youtube-transcript";

export interface VideoResult {
    id: string;
    title: string;
    url: string;
    duration: string;
    thumbnail: string;
    channel: string;
    views: number;
    uploadedAt: string;
    uploadedDate?: Date;
    transcript?: string;
}

export async function searchVideos(query: string, maxResults: number = 20): Promise<VideoResult[]> {
    try {
        const isLatest = query.includes("최신");
        const monthLimit = isLatest ? 2 : 6;

        console.log(`Searching for: ${query} (Limit: ${monthLimit} months)`);

        const videos = await YouTube.search(query, {
            limit: 30, // Fetch more to increase chance of matching date filter
            type: "video",
            safeSearch: false
        });

        const filterVideos = (limitDate: Date) => {
            return videos.map(v => {
                if (!v.id) return null;
                const videoDate = parseRelativeDate(v.uploadedAt);

                // If parsable, check date
                if (videoDate) {
                    if (videoDate >= limitDate) {
                        return {
                            id: v.id,
                            title: v.title || "",
                            url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                            duration: v.durationFormatted || "",
                            thumbnail: v.thumbnail?.url || "",
                            channel: v.channel?.name || "",
                            views: v.views || 0,
                            uploadedAt: v.uploadedAt || "",
                            uploadedDate: videoDate
                        } as VideoResult;
                    }
                } else {
                    // Fallback for very recent formats or unparsable
                    if (v.uploadedAt && (v.uploadedAt.includes("hour") || v.uploadedAt.includes("day") || v.uploadedAt.includes("week"))) {
                        return {
                            id: v.id,
                            title: v.title || "",
                            url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                            duration: v.durationFormatted || "",
                            thumbnail: v.thumbnail?.url || "",
                            channel: v.channel?.name || "",
                            views: v.views || 0,
                            uploadedAt: v.uploadedAt || "",
                            uploadedDate: new Date() // Treat as now
                        } as VideoResult;
                    }
                }
                return null;
            }).filter((v): v is VideoResult => v !== null);
        };

        let filtered = filterVideos(new Date(new Date().setMonth(new Date().getMonth() - monthLimit)));

        // Fallback: If 0 results and NOT in strict "Latest" mode, relax to 12 months (1 year)
        if (filtered.length === 0 && !isLatest) {
            console.log("Strict filter returned 0 results. Relaxing to 12 months...");
            const relaxedCutoff = new Date();
            relaxedCutoff.setMonth(relaxedCutoff.getMonth() - 12);
            filtered = filterVideos(relaxedCutoff);
        }

        // Fallback 2: If still 0, just take the top 5 regardless of date (to show SOMETHING)
        if (filtered.length === 0) {
            console.log("Relaxed filter returned 0 results. Returning top 5 regardless of date.");
            filtered = videos.slice(0, 5).map(v => ({
                id: v.id || "",
                title: v.title || "",
                url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                duration: v.durationFormatted || "",
                thumbnail: v.thumbnail?.url || "",
                channel: v.channel?.name || "",
                views: v.views || 0,
                uploadedAt: v.uploadedAt || "",
            }));
        }

        return filtered.slice(0, maxResults);
    } catch (error) {
        console.error("YouTube Search Error:", error);
        return [];
    }
}

export async function getTranscript(videoId: string): Promise<string | null> {
    try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        if (!transcriptItems || transcriptItems.length === 0) return null;
        return transcriptItems.map((item: any) => item.text).join(" ");
    } catch (error) {
        console.warn(`No transcript for video ${videoId}`);
        return null;
    }
}

function parseRelativeDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    const now = new Date();
    const str = dateStr.toLowerCase().trim();

    // "2 days ago", "1 month ago", "3 years ago"
    try {
        const parts = str.split(" ");
        if (parts.length < 2) return null;

        const val = parseInt(parts[0]);
        const unit = parts[1]; // hours, days, months, years...

        if (isNaN(val)) return null;

        if (unit.startsWith("second") || unit.startsWith("minute") || unit.startsWith("hour")) {
            return now; // Very recent
        }
        if (unit.startsWith("day")) {
            const d = new Date();
            d.setDate(now.getDate() - val);
            return d;
        }
        if (unit.startsWith("week")) {
            const d = new Date();
            d.setDate(now.getDate() - (val * 7));
            return d;
        }
        if (unit.startsWith("month")) {
            const d = new Date();
            d.setMonth(now.getMonth() - val);
            return d;
        }
        if (unit.startsWith("year")) {
            const d = new Date();
            d.setFullYear(now.getFullYear() - val);
            return d;
        }

        return null;
    } catch (e) {
        return null;
    }
}
