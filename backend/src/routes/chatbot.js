import fs from "fs";
import path from "path";
import express from "express";
import { upload } from "../middleware/upload.js";
import { config } from "../config.js";
import { ragQuery, ragReindex } from "../services/aiServiceClient.js";

const router = express.Router();

router.post("/query", async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const result = await ragQuery(question);
    res.json({ answer: result.answer, sources: result.sources || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/knowledge", upload.array("files", 20), async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const moved = [];
    for (const file of req.files) {
      const targetPath = path.join(config.dataDir, file.filename);
      fs.copyFileSync(file.path, targetPath);
      moved.push(targetPath);
    }

    const indexed = await ragReindex();
    res.json({
      message: "Knowledge uploaded and indexed",
      files: moved,
      indexed
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reindex", async (req, res, next) => {
  try {
    const result = await ragReindex();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
