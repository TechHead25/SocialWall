import path from "path";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { upload } from "../middleware/upload.js";
import { config } from "../config.js";
import { generateHighlights } from "../services/aiServiceClient.js";
import { readJson, writeJson } from "../services/storageService.js";

const router = express.Router();
const jobsFile = path.join(config.storageDir, "highlight-jobs.json");

router.post("/upload", upload.single("video"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Video file is required" });
    }

    const aiResponse = await generateHighlights(req.file.path);
    const jobs = readJson(jobsFile, []);

    const job = {
      id: uuidv4(),
      inputVideo: req.file.filename,
      output: aiResponse,
      createdAt: new Date().toISOString()
    };

    jobs.unshift(job);
    writeJson(jobsFile, jobs);

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.get("/jobs", (req, res) => {
  const jobs = readJson(jobsFile, []);
  res.json({ jobs });
});

export default router;
