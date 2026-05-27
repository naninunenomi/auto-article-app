require('dotenv').config({ path: '.env.local' });
console.log("KV_URL:", process.env.KV_REST_API_URL ? "Set" : "Not Set");
