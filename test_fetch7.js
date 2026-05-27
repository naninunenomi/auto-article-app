const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('=')[1].trim();

const url = `https://generativelanguage.googleapis.com/v1beta/models/foobar:generateContent?key=${key}`;

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
    })
}).then(r => r.json()).then(console.log).catch(console.error);
