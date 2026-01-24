import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { searchVideos, getTranscript, VideoResult } from "@/lib/youtube";

// Allow longer timeout for analysis
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { audience, topic } = await req.json();

        if (!topic) {
            return NextResponse.json(
                { error: "Topic is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
        }

        // 1. Search Videos
        const query = audience ? `${audience} ${topic}` : topic;
        console.log(`Analyzing for: ${query}`);

        const videoCandidates = await searchVideos(query, 15);
        if (videoCandidates.length === 0) {
            return NextResponse.json({ result: [] });
        }

        // 2. Fetch Transcripts & Analyze (Parallel)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const analysisPromises = videoCandidates.map(async (p: VideoResult) => {
            const transcript = await getTranscript(p.id);
            if (!transcript) return null; // Skip if no transcript

            // Truncate transcript to avoid token limits if necessary (Flash handles 1M+, so usually fine)
            // But for speed, let's keep it reasonable (e.g., first 15k chars is usually enough for digest)
            const truncatedTranscript = transcript.substring(0, 20000);

            const prompt = `
            You are a content analyst. 
            Target Audience: ${audience || "General"}
            Topic: ${topic}
            
            Video Title: ${p.title}
            Transcript (Excerpt): "${truncatedTranscript}"
            
            Analyze this video. Return a JSON object ONLY. No markdown formatting.
            Structure:
            {
                "keywords": ["tag1", "tag2", "tag3"],
                "key_points": ["point 1", "point 2", "point 3"],
                "purpose": "Brief sentence describing the goal/process of this video",
                "relevance_score": 85
            }
            `;

            try {
                const result = await model.generateContent(prompt);
                const response = result.response;
                const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                const analysis = JSON.parse(text);

                return {
                    ...p,
                    analysis
                };
            } catch (e) {
                console.error(`Failed to analyze ${p.id}:`, e);
                return null;
            }
        });

        const results = await Promise.all(analysisPromises);

        // Filter nulls and sort by score
        const validResults = results
            .filter(r => r !== null)
            .sort((a, b) => (b.analysis.relevance_score || 0) - (a.analysis.relevance_score || 0))
            .slice(0, 10);

        return NextResponse.json({ result: validResults });

    } catch (error) {
        console.error("Analysis Error:", error);
        return NextResponse.json(
            { error: "Failed to analyze content" },
            { status: 500 }
        );
    }
}
