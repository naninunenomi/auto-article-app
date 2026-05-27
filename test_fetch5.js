const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('=')[1].trim();

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
.then(r => r.json()).then(data => {
    if(data.models) console.log(data.models.map(m=>m.name).join('\n'));
    else console.log(data);
}).catch(console.error);
