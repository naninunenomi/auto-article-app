const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('=')[1].trim();

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`;

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
            thinkingConfig: { thinkingBudgetTokens: 1024 }
        }
    })
}).then(r => r.json()).then(console.log).catch(console.error);
