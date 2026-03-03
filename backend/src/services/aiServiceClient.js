import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { config } from "../config.js";

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 120000
});

function unwrapAiError(error) {
  const transportCode = error?.code || error?.cause?.code;
  if (transportCode === "ECONNRESET") {
    const wrapped = new Error(
      "AI service connection reset (ECONNRESET). Retry once; if repeated, check Gemini model access/quota and AI service logs."
    );
    wrapped.status = 502;
    return wrapped;
  }

  const upstreamMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "AI service request failed";

  const wrapped = new Error(upstreamMessage);
  wrapped.status = error?.response?.status || 500;
  return wrapped;
}

export async function ragQuery(question) {
  try {
    const { data } = await aiClient.post("/rag/query", { question });
    return data;
  } catch (error) {
    throw unwrapAiError(error);
  }
}

export async function ragReindex() {
  try {
    const { data } = await aiClient.post("/rag/reindex", {});
    return data;
  } catch (error) {
    throw unwrapAiError(error);
  }
}

export async function generateAvatar(imagePath, style, options = {}) {
  const formData = new FormData();
  formData.append("photo", fs.createReadStream(imagePath));
  formData.append("style", style);
  if (options.providerPreference) {
    formData.append("providerPreference", options.providerPreference);
  }
  if (options.intensity) {
    formData.append("intensity", String(options.intensity));
  }

  try {
    const { data } = await aiClient.post("/avatar/generate", formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity
    });

    return data;
  } catch (error) {
    throw unwrapAiError(error);
  }
}

export async function generateHighlights(videoPath) {
  const formData = new FormData();
  formData.append("video", fs.createReadStream(videoPath));

  try {
    const { data } = await aiClient.post("/highlights/generate", formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 300000
    });

    return data;
  } catch (error) {
    throw unwrapAiError(error);
  }
}
