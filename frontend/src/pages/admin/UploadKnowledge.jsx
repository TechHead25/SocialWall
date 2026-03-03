import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";

export default function UploadKnowledge() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const uploadKnowledge = async () => {
    if (!files.length) return;

    const formData = new FormData();
    [...files].forEach((file) => formData.append("files", file));

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/chatbot/knowledge", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMessage(data.message || "Knowledge uploaded.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Upload failed");
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
      <h1 className="text-2xl font-semibold text-cyan-300">Upload Knowledge</h1>
      <p className="mt-2 text-slate-400">Add PDF/TXT/CSV files for the WhatsApp RAG bot.</p>
      <input
        className="input mt-4"
        type="file"
        multiple
        accept=".pdf,.txt,.csv"
        onChange={(e) => setFiles(e.target.files || [])}
      />
      <button className="btn-primary mt-4" disabled={loading} onClick={uploadKnowledge}>
        {loading ? "Indexing..." : "Upload & Reindex"}
      </button>
      {message && <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{message}</p>}
    </motion.section>
  );
}
