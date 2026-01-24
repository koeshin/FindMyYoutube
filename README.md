# FindMyYouTube: AI-Powered Deep Research & Video Curator

**FindMyYouTube** is an intelligent agent that performs deep research on any topic and cures relevant YouTube videos. It utilizes **Google Gemini 1.5 Pro** for reasoning and writing, **Tavily API** for deep web search, and **YouTube** for video discovery.

## 🚀 Features

*   **Deep Research Agent**: Decomposes user queries into a multi-step research plan.
*   **Comprehensive Reports**: Generates professional Markdown reports with citations.
*   **Video Curation**: Finds and displays top 5 relevant YouTube videos with metadata.
*   **Clean UI**: Dark-themed, distraction-free interface inspired by YouTube.

## ⚠️ Current Status (Work In Progress)

*   **Status**: Alpha / Prototype
*   **Testing**: logic has **not been fully tested** yet.
*   **UI/UX**: The current interface is functional but **scheduled for major redesign and improvements**.

## 🛠️ Stack

*   **Framework**: Next.js 14 (App Router)
*   **AI Model**: Google Gemini 1.5 Pro (via `gemini-1.5-flash` or `pro`)
*   **Search**: Tavily API (`@tavily/core`)
*   **Styling**: Tailwind CSS
*   **Markdown**: `react-markdown` + `@tailwindcss/typography`

## 📦 Getting Started

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables in `.env.local`:
    ```env
    GEMINI_API_KEY=your_gemini_key
    TAVILY_API_KEY=your_tavily_key
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
