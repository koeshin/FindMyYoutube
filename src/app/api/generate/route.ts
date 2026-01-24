import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { topic } = await req.json();

        if (!topic) {
            return NextResponse.json(
                { error: "Topic is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "API Key not configured" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `
You are a professional YouTube Content Strategist.
Create a detailed content plan for a YouTube video about: "${topic}"

Please format the response in cleaner Markdown.
Use the following structure:

## 1. Catchy Titles (5 Options)
- List 5 click-worthy titles

## 2. SEO Keywords
- Comma-separated list of high volume keywords

## 3. Video Structure & Script Outline
- **Intro (0:00-1:00)**: Hook and value proposition
- **Body Paragraphs**: Key points to cover
- **Conclusion**: Call to Action (CTA)

## 4. Valid Reference Ideas (Mocked if necessary)
- Suggest types of images/b-roll to use

Start directly with the content. Do not add introductory conversational text.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ result: text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate content" },
            { status: 500 }
        );
    }
}
