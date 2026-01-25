import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { searchVideos } from "@/lib/youtube";

export const maxDuration = 60; // Allow long running for research

// Initialize Tavily
const tavilyClient = process.env.TAVILY_API_KEY ? tavily({ apiKey: process.env.TAVILY_API_KEY }) : null;

export async function POST(req: Request) {
    try {
        const { topic, tavilyKey } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        // Use provided key or env key
        const activeTavilyKey = tavilyKey || process.env.TAVILY_API_KEY;
        if (!activeTavilyKey) {
            return NextResponse.json({ error: "Tavily API Key is required" }, { status: 401 });
        }

        // Re-init client if key provided in request
        const tvly = tavilyKey ? tavily({ apiKey: tavilyKey }) : tavilyClient;
        if (!tvly) {
            return NextResponse.json({ error: "Failed to initialize Search Client" }, { status: 500 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Note: User requested "gemini-3-flash" for everything.
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const today = new Date().toISOString().split('T')[0];

        // --- Step 1: Planner ---
        console.log("Step 1: Planning...");
        const planPrompt = `
        You are a Deep Research Planner.
        User Query: "${topic}"
        Current Date: ${today}
        
        Goal: Decompose this query into a research plan.
        1. Generate 5 distinct, high-quality search queries for a search engine (Tavily) to gather comprehensive information.
        2. Generate 1 specific keyword/phrase to search for relevant YouTube videos.
        
        Return JSON ONLY:
        {
            "search_queries": ["query1", "query2", ...],
            "video_keyword": "keyword"
        }
        `;

        const planResult = await model.generateContent(planPrompt);
        const text = planResult.response.text();

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Failed to parse JSON Plan:", text);
            throw new Error("Invalid JSON format from Planner");
        }

        const plan = JSON.parse(jsonMatch[0]);

        console.log("Plan:", plan);

        // --- Step 2: Executor (Parallel Search) ---
        console.log("Step 2: Executing Search...");

        // A. Tavily Search
        const searchPromises = plan.search_queries.map((q: string) =>
            tvly.search(q, {
                search_depth: "advanced",
                max_results: 3,
                include_answer: true
            }).catch(e => ({ results: [], answer: "" }))
        );

        // B. YouTube Search (Top 10 as requested)
        const videoPromise = searchVideos(plan.video_keyword, 10);

        const [searchResults, videoResults] = await Promise.all([
            Promise.all(searchPromises),
            videoPromise
        ]);

        // Aggregate Context
        let researchContext = `Report Date: ${today}\n\n`;

        // Add Plan to Context
        researchContext += `=== RESEARCH STRATEGY ===\n`;
        researchContext += `Search Queries: ${plan.search_queries.join(', ')}\n`;
        researchContext += `Video Keyword: ${plan.video_keyword}\n\n`;

        // Add Web Results
        researchContext += `=== WEB SEARCH RESULTS ===\n`;
        searchResults.forEach((res: any, idx: number) => {
            researchContext += `\n--- Query: ${plan.search_queries[idx]} ---\n`;
            if (res.answer) researchContext += `AI Answer: ${res.answer}\n`;
            res.results.forEach((r: any) => {
                researchContext += `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`;
            });
        });

        // Add Video Results to Context (Requested feature)
        researchContext += `\n=== YOUTUBE VIDEO CONTEXT ===\n`;
        videoResults.forEach((v: any) => {
            researchContext += `Video Title: ${v.title}\nChannel: ${v.channel}\nPublished: ${v.uploadedAt}\nLink: ${v.url}\n\n`;
        });

        // TRUNCATION (Increased slightly as videos add text)
        if (researchContext.length > 30000) {
            console.log(`Context too large (${researchContext.length}), truncating to 30k chars...`);
            researchContext = researchContext.substring(0, 30000) + "\n...(Truncated)...";
        }

        // --- Step 3: Writer ---
        console.log("Step 3: Writing Report...");
        const writePrompt = `
        You are a detailed Research Analyst and Writer.
        User Query: "${topic}"
        Date: ${today}
        
        Research Context:
        ${researchContext}
        
        Task: Write a comprehensive, professional Markdown report.
        
        Requirements:
        1. **Header**: Start with a Metadata block (Date, Topic, Research Strategy Summary).
        2. **Research Strategy**: Briefly explain the approach taken (the queries used) so the reader understands the scope.
        3. **Integration**: You MUST integrate findings from BOTH the Web Search Results AND the YouTube Video Context.
           - When citing a web page, use [Title](URL).
           - When citing a video, use [Video: Title](URL).
        4. **Structure**: 
           - Executive Summary
           - Key Findings (Grouped logically)
           - Market/Technical Analysis
           - **Video Highlights**: A dedicated section summarizing key insights derived specifically from the video list provided.
           - Conclusion
        5. **Length**: Detailed and substantial.
        
        Start immediately with the markdown content.
        `;

        const writeResult = await model.generateContent(writePrompt);
        const report = writeResult.response.text();

        return NextResponse.json({
            report,
            videos: videoResults,
            debug_plan: plan
        });

    } catch (error) {
        console.error("Research Error:", error);
        return NextResponse.json(
            { error: "Failed to complete research." },
            { status: 500 }
        );
    }
}
