import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";

import { apiKey } from "./auth.js";
import { interpretCommand } from "./commandParser.js";
import { extractArticle } from "./contentExtractor.js";
import { synthesize } from "./tts.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(compression());
app.use(morgan("tiny"));
app.use(apiKey);

// ✅ Health
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "VoiceNav Backend" });
});

// ✅ Interpret user speech command
app.post("/interpret", (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript" });

  const result = interpretCommand({ text: transcript });
  res.json(result);
});

// ✅ Extract readable content from URL
app.get("/read", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url?url=" });

  try {
    const data = await extractArticle(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ TTS (server → frontend uses browser speech)
app.post("/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  const result = await synthesize(text);
  res.json(result);
});

app.listen(process.env.PORT, () =>
  console.log("✅ VoiceNav backend running on port", process.env.PORT)
);
