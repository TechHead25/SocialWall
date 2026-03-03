import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../");

export const config = {
  port: Number(process.env.PORT || process.env.BACKEND_PORT || 5000),
  llmApiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000",
  whatsappBotName: process.env.WHATSAPP_BOT_NAME || "Anveshana Guide",
  whatsappReplyMaxChars: Number(process.env.WHATSAPP_REPLY_MAX_CHARS || 900),
  dataDir: path.resolve(ROOT, "data"),
  uploadDir: path.resolve(ROOT, "backend/uploads"),
  storageDir: path.resolve(ROOT, "backend/storage")
};
