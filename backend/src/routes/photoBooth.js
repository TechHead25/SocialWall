import express from "express";
import { upload } from "../middleware/upload.js";
import { generateAvatar } from "../services/aiServiceClient.js";

const router = express.Router();

const STYLES = [
  "futuristic engineer",
  "space scientist",
  "cyberpunk innovator"
];

router.get("/styles", (req, res) => {
  res.json({ styles: STYLES });
});

router.post("/avatar", upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Photo is required" });
    }

    const style = req.body.style || STYLES[0];
    if (!STYLES.includes(style)) {
      return res.status(400).json({ error: "Invalid style selection" });
    }

    const providerPreference = req.body.providerPreference || "auto";
    const intensity = Number(req.body.intensity ?? 0.72);

    if (!["auto", "gemini", "diffusers"].includes(providerPreference)) {
      return res.status(400).json({ error: "Invalid providerPreference" });
    }

    if (Number.isNaN(intensity) || intensity < 0.35 || intensity > 0.95) {
      return res.status(400).json({ error: "intensity must be between 0.35 and 0.95" });
    }

    const generated = await generateAvatar(req.file.path, style, {
      providerPreference,
      intensity
    });
    res.json(generated);
  } catch (error) {
    next(error);
  }
});

export default router;
