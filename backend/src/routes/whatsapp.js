import express from "express";
import { ragQuery } from "../services/aiServiceClient.js";
import { config } from "../config.js";

const router = express.Router();

function toTwiml(message) {
  const safe = String(message || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

function trimReply(text, maxChars) {
  if (!text) return "I am unsure based on current event knowledge.";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "whatsapp-rag" });
});

router.post("/webhook", async (req, res) => {
  const incomingText = (req.body?.Body || "").trim();
  const from = req.body?.From || "unknown";

  if (!incomingText) {
    const help = `${config.whatsappBotName}: Send your event question and I'll answer from the knowledge base.`;
    res.type("text/xml").send(toTwiml(help));
    return;
  }

  try {
    const rag = await ragQuery(incomingText);
    const answer = trimReply(rag.answer, config.whatsappReplyMaxChars);
    console.log(`[WHATSAPP BOT] ${from}: ${incomingText}`);
    res.type("text/xml").send(toTwiml(answer));
  } catch (error) {
    console.error("[WHATSAPP BOT ERROR]", error.message);
    const fallback = `${config.whatsappBotName}: Sorry, I'm temporarily unavailable. Please try again in a moment.`;
    res.type("text/xml").send(toTwiml(fallback));
  }
});

export default router;
