const https = require('https');

const apiKey = 'AIzaSyDwpuOd1sT6SJ15J3y4pwispSMj5RAvr5A';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Fetching models...");

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.error(`Error: Status Code ${res.statusCode}`);
            console.error(data);
        } else {
            const response = JSON.parse(data);
            if (response.models) {
                console.log("Available Models:");
                response.models.forEach(m => {
                    if (m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name}`);
                    }
                });
                // Also print regular ones if no gemini found
                if (!response.models.some(m => m.name.includes('gemini'))) {
                    console.log("No 'gemini' models found. All models:");
                    response.models.forEach(m => console.log(`- ${m.name}`));
                }
            } else {
                console.log("No models property in response.", data);
            }
        }
    });

}).on('error', (err) => {
    console.error("Network Error:", err.message);
});
