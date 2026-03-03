import OpenAI from "openai";
import { config } from "../config.js";

const client = config.llmApiKey
  ? new OpenAI({ apiKey: config.llmApiKey })
  : null;

export async function moderateText(input) {
  if (!client || !input?.trim()) {
    return { flagged: false, reason: "No moderation key configured or empty input" };
  }

  const response = await client.moderations.create({
    model: "omni-moderation-latest",
    input
  });

  const result = response.results?.[0] || { flagged: false, categories: {} };
  return {
    flagged: !!result.flagged,
    categories: result.categories || {}
  };
}
