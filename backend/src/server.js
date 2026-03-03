import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

import { config } from "./config.js";
import chatbotRoutes from "./routes/chatbot.js";
import whatsappRoutes from "./routes/whatsapp.js";
import photoBoothRoutes from "./routes/photoBooth.js";
import socialWallRoutes from "./routes/socialWall.js";
import highlightsRoutes from "./routes/highlights.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(config.uploadDir)));

app.get("/", (req, res) => {
  res.json({
    service: "anveshana-backend",
    message: "Backend is running. Use /api for available routes."
  });
});

app.get("/api", (req, res) => {
  res.json({
    service: "anveshana-backend",
    routes: [
      "GET /api/health",
      "POST /api/chatbot/query",
      "POST /api/chatbot/knowledge",
      "POST /api/chatbot/reindex",
      "POST /api/whatsapp/webhook",
      "GET /api/photo-booth/styles",
      "POST /api/photo-booth/avatar",
      "POST /api/social-wall/posts",
      "GET /api/social-wall/posts",
      "PATCH /api/social-wall/posts/:id/moderate",
      "GET /api/social-wall/analytics",
      "POST /api/highlights/upload",
      "GET /api/highlights/jobs"
    ]
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "anveshana-backend" });
});

app.use("/api/chatbot", chatbotRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/photo-booth", photoBoothRoutes);
app.use("/api/social-wall", socialWallRoutes);
app.use("/api/highlights", highlightsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
