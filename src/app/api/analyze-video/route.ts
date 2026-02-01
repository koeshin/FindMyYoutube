import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getTranscript } from "@/lib/youtube";

// Allow longer timeout for analysis
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { videoId, title } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    // 1. Fetch Transcript
    const transcript = await getTranscript(videoId);
    
    if (!transcript) {
        return NextResponse.json({ 
            error: "Transcript not available", 
            fallback: true 
        }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Prompt Gemini
    const prompt = `
    You are an expert content editor for a video curation service.
    
    Video Title: "${title}"
    Transcript: "${transcript.substring(0, 50000)}" (Truncated if too long)

    Task:
    1. **Subtitle**: Create a single "News Headline" style subtitle that captures the essence of the video. It should be catchy and informative. (max 1 sentence)
    2. **Summary**: Create a 3-point summary using a "Deductive" (Two-galsik) structure. 
       - For each point, the FIRST sentence must be the core conclusion/insight.
       - Following sentences should provide context or details.
       - Each point should be roughly 2-3 sentences.
    
    Return pure JSON format ONLY:
    {
      "subtitle": "News style headline...",
      "summary": [
        "Core conclusion 1. Details...",
        "Core conclusion 2. Details...",
        "Core conclusion 3. Details..."
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean and parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Gemini response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
