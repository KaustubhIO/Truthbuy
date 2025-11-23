import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// Make sure this variable is set in your Render Dashboard
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL_ID || "x-ai/grok-4.1-fast:free"; 

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TruthBuy Backend OK");
});

app.post("/analyze", async (req, res) => {
  try {
    const product = req.body?.productData;
    if (!product) {
      return res.status(400).json({ error: "Missing productData" });
    }

    // Speed-Optimized Prompt
    const prompt = `
Analyze this Amazon product. Return ONLY JSON.
{
  "reliability_score": number (0-10),
  "verdict": "BUY" | "CONSIDER" | "AVOID" | "CAUTION",
  "red_flags": [string],
  "pros": [string],
  "cons": [string],
  "suitability": { "best": [string], "not": [string] },
  "score_breakdown": { "Reliability": number, "Satisfaction": number, "Value": number },
  "competitors": [string],
  "summary": string,
  "detailed_analysis": string
}
DATA: ${JSON.stringify(product).substring(0, 15000)} 
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(500).json({ error: "Model API error", details: txt });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Robust JSON Parsing
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "Invalid JSON returned", raw });
    }

    const json = JSON.parse(raw.slice(start, end + 1));
    res.json({ success: true, analysis: json });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`TruthBuy backend running on port ${PORT}`);
});
