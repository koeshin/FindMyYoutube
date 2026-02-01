import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getTranscript, searchOfficialYoutube, VideoResult } from "@/lib/youtube";

export const maxDuration = 60; // Allow long running for batch processing

// Helper: Calculate metadata-only score for 1st stage ranking (fast)
function calculateMetadataScore(v: VideoResult, topic: string, savedChannels: string[]): number {
    const lowerTitle = v.title.toLowerCase();
    const keywords = topic.toLowerCase().split(' ').filter(k => k.length > 1);

    let score = 0;
    keywords.forEach(k => {
        if (lowerTitle.includes(k)) score += 10;
    });

    if (savedChannels.includes(v.channel)) score += 30;

    return score;
}

// Helper: Calculate deep relevance score from transcript or description
function calculateDeepScore(text: string, topic: string, channel: string, savedChannels: string[]): { score: number, reasoning: string, missed: string[] } {
    const lowerText = text.toLowerCase();
    const keywords = topic.toLowerCase().split(' ').filter(k => k.length > 1);

    const missedKeywords = keywords.filter(k => !lowerText.includes(k));
    const hitRatio = (keywords.length - missedKeywords.length) / keywords.length;

    // Keyword Density
    const density = keywords.reduce((acc, k) => acc + (lowerText.split(k).length - 1), 0);
    const isSaved = savedChannels.includes(channel);

    let score = 0;
    let reasoningParts = [];

    if (missedKeywords.length === 0) {
        score += 50;
        reasoningParts.push("Exact Match");
    } else if (hitRatio >= 0.5) {
        score += 30;
        reasoningParts.push("Partial Match");
    } else if (hitRatio > 0) {
        score += 10;
        reasoningParts.push("Weak Match");
    }

    if (density > 5) {
        score += Math.min(density, 20);
        reasoningParts.push("High Density");
    }

    if (isSaved) {
        score += 30;
        reasoningParts.push("Saved Channel");
    }

    if (text.length < 200) score -= 40;

    return { score, reasoning: reasoningParts.join(", ") || "Filtered", missed: missedKeywords };
}

export async function POST(req: Request) {
    try {
        const { topic, savedChannels = [] } = await req.json();
        if (!topic) return NextResponse.json({ error: "Topic required" }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "No Gemini API Key" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log(`[Batch Pipeline] Searching for: ${topic}`);

        // Step 1: Broad Search (100 Results)
        const candidates = await searchOfficialYoutube(topic, 100);
        console.log(`[Batch Pipeline] Found ${candidates.length} candidates.`);

        // Step 2: Metadata Pre-Ranking (Pick top 40)
        const preRanked = candidates.map(v => ({
            ...v,
            preScore: calculateMetadataScore(v, topic, savedChannels)
        })).sort((a, b) => b.preScore - a.preScore).slice(0, 40);

        // Step 3: Deep Verification (Transcript with Description Fallback)
        const verified = await Promise.all(preRanked.map(async (v) => {
            try {
                let transcript = await getTranscript(v.id);
                let usedFallback = false;

                if (!transcript || transcript.length < 300) {
                    transcript = v.description || "No content available.";
                    usedFallback = true;
                }

                const { score, reasoning, missed } = calculateDeepScore(transcript, topic, v.channel, savedChannels);

                return {
                    ...v,
                    transcript,
                    score: usedFallback ? score - 5 : score,
                    reasoning: usedFallback ? `${reasoning} (Desc Fallback)` : reasoning,
                    missed
                };
            } catch (e) {
                return { ...v, score: -20, reasoning: "Error", transcript: "", missed: [] };
            }
        }));

        // Step 4: Final SELECTION (Top 10) - Reduced from 20 to avoid Gemini 15 RPM Rate Limit
        const topSelections = verified
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        console.log(`[Batch Pipeline] Analysis starting for top 20.`);

        // Step 5: BATCHED AI Analysis (To avoid Rate Limits)
        // We will process individual summaries and global report in sequential/small batches
        const batchSize = 5;
        const analyzedVideos: any[] = [];

        for (let i = 0; i < topSelections.length; i += batchSize) {
            const currentBatch = topSelections.slice(i, i + batchSize);
            const batchPromises = currentBatch.map(async (v) => {
                const prompt = `
                Video: "${v.title}"
                Content: "${v.transcript.substring(0, 10000)}"
                Task: Create a news-style subtitle and a 3-point summary.
                Return pure JSON: { "subtitle": "...", "summary": ["...", "...", "..."] }
                `;
                try {
                    const res = await model.generateContent(prompt);
                    const text = res.response.text();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    return { ...v, analysis: jsonMatch ? JSON.parse(jsonMatch[0]) : null };
                } catch (e) {
                    console.error(`Gemini Individual Analysis Error for ${v.id}:`, e);
                    return { ...v, analysis: null };
                }
            });
            const results = await Promise.all(batchPromises);
            analyzedVideos.push(...results);

            // Subtle delay between batches if needed, but for Flash 5 is usually safe
            if (i + batchSize < topSelections.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // Global Report Synthesis (Uses top 5 verified content)
        console.log(`[Batch Pipeline] Synthesizing Global Report...`);
        const reportPrompt = `
        Topic: "${topic}"
        Context: The following are the most relevant findings from YouTube videos.
        Findings:
        ${topSelections.slice(0, 5).map(v => `- [${v.title}]: ${v.transcript.substring(0, 3000)}`).join('\n')}

        Task: Create a comprehensive "Research Report" in Markdown.
        Include sections: # Overview, ## Key Insights, ## Critical Gaps, ## Recommendations.
        Keep it professional, evidence-based, and concise.
        `;

        let reportData = "Report generation failed.";
        try {
            const reportRes = await model.generateContent(reportPrompt);
            reportData = reportRes.response.text();
        } catch (e: any) {
            console.error("Gemini Global Report Error:", e);
            reportData = `Report generation failed: ${e.message || "Internal Error"}`;
        }

        return NextResponse.json({
            status: "success",
            videos: analyzedVideos,
            report: reportData
        });

    } catch (error: any) {
        console.error("Batch Research Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
