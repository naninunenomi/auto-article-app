const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('=')[1].trim();
console.log("Key length:", key.length, "Prefix:", key.substring(0,4));

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
console.log("URL:", url.substring(0, 80) + "...");

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
        tools: [{ googleSearchRetrieval: {} }]
    })
}).then(r => r.json()).then(console.log).catch(console.error);
