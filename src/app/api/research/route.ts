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

        // Initialize Gemini with User Requested Model
        const genAI = new GoogleGenerativeAI(apiKey);

        // Note: User requested "gemini-1.5-pro". Quota limits (429) may apply.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // --- Step 1: Planner ---
        console.log("Step 1: Planning...");
        const planPrompt = `
        You are a Deep Research Planner.
        User Query: "${topic}"
        
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
        const planText = planResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const plan = JSON.parse(planText);

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

        // B. YouTube Search
        const videoPromise = searchVideos(plan.video_keyword, 5);

        const [searchResults, videoResults] = await Promise.all([
            Promise.all(searchPromises),
            videoPromise
        ]);

        // Aggregate Context
        let researchContext = "";
        searchResults.forEach((res: any, idx: number) => {
            researchContext += `\n--- Search Query: ${plan.search_queries[idx]} ---\n`;
            if (res.answer) researchContext += `Direct Answer: ${res.answer}\n`;
            res.results.forEach((r: any) => {
                researchContext += `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`;
            });
        });

        // TRUNCATION: Critical for Free Tier Quotas
        // Gemini 1.5 Flash Free Tier has limits on RPM and TPM. 
        // Truncating to ~25k chars ensures we likely stay within the ~1M token limit but more importantly
        // helps reduce the load for the per-minute limit if multiple requests happen.
        if (researchContext.length > 25000) {
            console.log(`Context too large (${researchContext.length}), truncating to 25k chars...`);
            researchContext = researchContext.substring(0, 25000) + "\n...(Truncated for Quota Limits)...";
        }

        // --- Step 3: Writer ---
        console.log("Step 3: Writing Report...");
        const writePrompt = `
        You are a detailed Research Analyst and Writer.
        User Query: "${topic}"
        
        Research Context:
        ${researchContext}
        
        Task: Write a comprehensive, professional Markdown report based *only* on the context provided.
        
        Guidelines:
        - Structure: Introduction, Key Findings (grouped logically), Technical/Market Analysis, Conclusion.
        - Tone: Professional, Objective, Deep.
        - **Citations**: You MUST cite your sources. Use [Title](URL) format inline or as footnotes.
        - Length: Substantial and detailed.
        
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
