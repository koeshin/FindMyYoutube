const YouTube = require("youtube-sr").default;
const { YoutubeTranscript } = require("youtube-transcript");

async function parseRelativeDate(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    const str = dateStr.toLowerCase().trim();
    console.log(`Parsing date: "${str}"`);

    try {
        const parts = str.split(" ");
        if (parts.length < 2) return null;

        const val = parseInt(parts[0]);
        const unit = parts[1];

        if (isNaN(val)) return null;

        let d = new Date();
        if (unit.startsWith("second") || unit.startsWith("minute") || unit.startsWith("hour")) {
            // d is now
        } else if (unit.startsWith("day")) {
            d.setDate(now.getDate() - val);
        } else if (unit.startsWith("week")) {
            d.setDate(now.getDate() - (val * 7));
        } else if (unit.startsWith("month")) {
            d.setMonth(now.getMonth() - val);
        } else if (unit.startsWith("year")) {
            d.setFullYear(now.getFullYear() - val);
        } else {
            return null;
        }
        return d;
    } catch (e) {
        return null;
    }
}

async function main() {
    const query = "20대 여자 나트랑 여행";
    console.log(`Searching for: ${query}`);

    try {
        const videos = await YouTube.search(query, { limit: 5, type: "video", safeSearch: false });
        console.log(`Found ${videos.length} videos.`);

        for (const v of videos) {
            console.log(`\n--------------------------------`);
            console.log(`Title: ${v.title}`);
            console.log(`UploadedAt: ${v.uploadedAt}`);

            const date = await parseRelativeDate(v.uploadedAt);
            console.log(`Parsed Date: ${date ? date.toISOString() : "null"}`);

            // Test Transcript
            console.log(`Fetching transcript for ${v.id}...`);
            try {
                const transcript = await YoutubeTranscript.fetchTranscript(v.id);
                console.log(`Transcript found! Length: ${transcript.length} items`);
            } catch (e) {
                console.log(`Transcript FAILED: ${e.message}`);
            }
        }

    } catch (e) {
        console.error("Search failed:", e);
    }
}

main();
