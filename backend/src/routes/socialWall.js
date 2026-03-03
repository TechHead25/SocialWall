import path from "path";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { upload } from "../middleware/upload.js";
import { config } from "../config.js";
import { moderateText } from "../services/moderationService.js";
import { readJson, writeJson } from "../services/storageService.js";

const router = express.Router();
const postsFile = path.join(config.storageDir, "posts.json");

router.post("/posts", upload.single("image"), async (req, res, next) => {
  try {
    const caption = req.body.caption || "";
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const moderation = await moderateText(caption);
    const status = moderation.flagged ? "rejected" : "pending";

    const posts = readJson(postsFile, []);
    const post = {
      id: uuidv4(),
      caption,
      imageUrl: `/uploads/${req.file.filename}`,
      status,
      moderation,
      createdAt: new Date().toISOString()
    };

    posts.unshift(post);
    writeJson(postsFile, posts);

    res.status(201).json({
      message: moderation.flagged
        ? "Post rejected by AI moderation"
        : "Post submitted for approval",
      post
    });
  } catch (error) {
    next(error);
  }
});

router.get("/posts", (req, res) => {
  const status = req.query.status || "approved";
  const posts = readJson(postsFile, []);
  const filtered = status === "all" ? posts : posts.filter((post) => post.status === status);
  res.json({ posts: filtered });
});

router.patch("/posts/:id/moderate", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }

  const posts = readJson(postsFile, []);
  const postIndex = posts.findIndex((post) => post.id === id);

  if (postIndex < 0) {
    return res.status(404).json({ error: "Post not found" });
  }

  posts[postIndex].status = status;
  posts[postIndex].moderatedAt = new Date().toISOString();
  writeJson(postsFile, posts);

  res.json({ message: `Post ${status}`, post: posts[postIndex] });
});

router.get("/analytics", (req, res) => {
  const posts = readJson(postsFile, []);
  const analytics = {
    totalPosts: posts.length,
    approvedPosts: posts.filter((p) => p.status === "approved").length,
    pendingPosts: posts.filter((p) => p.status === "pending").length,
    rejectedPosts: posts.filter((p) => p.status === "rejected").length
  };

  res.json(analytics);
});

export default router;
