import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";

export default function UploadVideo() {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!video) return;
    const formData = new FormData();
    formData.append("video", video);

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/highlights/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(data.output);
    } catch (err) {
      setError(err.response?.data?.error || "Video processing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-6"
    >
      <h1 className="text-2xl font-semibold text-cyan-300">Upload Video</h1>
      <p className="mt-2 text-slate-400">Generate auto highlights using Whisper + FFmpeg.</p>
      <input className="input mt-4" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0])} />
      <button className="btn-primary mt-4" disabled={loading} onClick={handleUpload}>
        {loading ? "Processing..." : "Generate Highlights"}
      </button>

      {error && <p className="mt-3 text-rose-400">{error}</p>}

      {result && (
        <div className="mt-5 space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-300">Highlights extracted successfully.</p>
          <video controls className="w-full rounded-lg" src={result.reelUrl} />
        </div>
      )}
    </motion.section>
  );
}
