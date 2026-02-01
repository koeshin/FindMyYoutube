import YouTube from "youtube-sr";
import { YoutubeTranscript } from "youtube-transcript";
import { spawn } from "child_process";
import path from "path";

export interface VideoResult {
    id: string;
    title: string;
    description?: string;
    url: string;
    duration: string;
    thumbnail: string;
    channel: string;
    views: number;
    uploadedAt: string;
    uploadedDate?: Date;
    transcript?: string;
    score?: number;
    reasoning?: string;
    missed?: string[];
    analysis?: {
        subtitle: string;
        summary: string[];
    } | null;
}

export async function searchOfficialYoutube(query: string, maxResults: number = 50): Promise<VideoResult[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY") {
        console.warn("YOUTUBE_API_KEY is missing or default. Falling back to youtube-sr.");
        return searchVideos(query, maxResults);
    }

    try {
        let allResults: any[] = [];
        let nextPageToken = "";
        const iterations = Math.ceil(maxResults / 50);

        for (let i = 0; i < iterations; i++) {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${Math.min(50, maxResults - allResults.length)}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.error("YouTube API Error:", data.error);
                break;
            }

            if (data.items) {
                allResults.push(...data.items);
            }

            nextPageToken = data.nextPageToken;
            if (!nextPageToken || allResults.length >= maxResults) break;
        }

        return allResults.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            duration: "",
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            channel: item.snippet.channelTitle,
            views: 0,
            uploadedAt: item.snippet.publishedAt,
            uploadedDate: new Date(item.snippet.publishedAt)
        }));
    } catch (error) {
        console.error("Official YouTube Search Error:", error);
        return [];
    }
}

export async function searchVideos(query: string, maxResults: number = 20): Promise<VideoResult[]> {
    try {
        const isLatest = query.includes("최신");
        const monthLimit = isLatest ? 2 : 6;

        console.log(`Searching for: ${query} (Limit: ${monthLimit} months)`);

        const videos = await YouTube.search(query, {
            limit: Math.max(30, maxResults * 1.5),
            type: "video",
            safeSearch: false
        });

        const filterVideos = (limitDate: Date) => {
            return videos.map(v => {
                if (!v.id) return null;
                const videoDate = parseRelativeDate(v.uploadedAt);

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
                            uploadedDate: new Date()
                        } as VideoResult;
                    }
                }
                return null;
            }).filter((v): v is VideoResult => v !== null);
        };

        let filtered = filterVideos(new Date(new Date().setMonth(new Date().getMonth() - monthLimit)));

        if (filtered.length === 0 && !isLatest) {
            console.log("Strict filter returned 0 results. Relaxing to 12 months...");
            const relaxedCutoff = new Date();
            relaxedCutoff.setMonth(relaxedCutoff.getMonth() - 12);
            filtered = filterVideos(relaxedCutoff);
        }

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
    const scriptPath = path.resolve(process.cwd(), "src/scripts/get_transcript.py");

    return new Promise((resolve) => {
        const pythonProcess = spawn("python3", [scriptPath, videoId]);

        let dataString = "";

        pythonProcess.stdout.on("data", (data: Buffer) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on("data", (data: Buffer) => {
            // console.error(`Python Error: ${data}`); // Optional: Log python errors
        });

        pythonProcess.on("close", (code: number) => {
            if (code !== 0) {
                console.warn(`Python script exited with code ${code} for video ${videoId}`);
                resolve(null);
                return;
            }

            try {
                const result = JSON.parse(dataString);
                if (result.success) {
                    resolve(result.transcript);
                } else {
                    console.warn(`Python transcript fetch failed: ${result.error}`);
                    resolve(null);
                }
            } catch (e) {
                console.error("Failed to parse Python output", e);
                resolve(null);
            }
        });
    });
}

function parseRelativeDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    const now = new Date();
    const str = dateStr.toLowerCase().trim();

    try {
        const parts = str.split(" ");
        if (parts.length < 2) return null;

        const val = parseInt(parts[0]);
        const unit = parts[1];

        if (isNaN(val)) return null;

        if (unit.startsWith("second") || unit.startsWith("minute") || unit.startsWith("hour")) {
            return now;
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
