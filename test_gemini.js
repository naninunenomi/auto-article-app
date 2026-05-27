const { GoogleGenAI } = require("@google/genai");

async function run() {
  const apiKey = "AIzaSyBPK1bZOsz4OYO-ANNUYwxOPW7sVS9-q5k"; // from .env.local
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("Success gemini-3:", response.text);
  } catch (e) {
    console.error("Error gemini-3:", e.message);
  }

  try {
    const response2 = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("Success gemini-2.5:", response2.text);
  } catch (e) {
    console.error("Error gemini-2.5:", e.message);
  }
}

run();
