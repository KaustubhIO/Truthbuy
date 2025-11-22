import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
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
    if (!product) return res.status(400).json({ error: "Missing productData" });

    const prompt = `
Return only valid JSON in this exact format:
{
  "reliability_score": number,
  "verdict": "BUY" | "CONSIDER" | "AVOID",
  "red_flags": [string],
  "pros": [string],
  "cons": [string],
  "summary": string,
  "detailed_analysis": string
}

Product data:
${JSON.stringify(product)}
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
          { role: "system", content: "Always return ONLY valid JSON." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      return res.status(500).json({
        error: "Model API error",
        details: await response.text()
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "Invalid JSON returned", raw });
    }

    const json = JSON.parse(raw.slice(start, end + 1));
    res.json({ success: true, analysis: json });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`TruthBuy backend running on port ${PORT}`);
});
