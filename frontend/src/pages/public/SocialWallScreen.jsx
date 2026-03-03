import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, resolveAssetUrl } from "../../lib/api";

export default function SocialWallScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    try {
      const { data } = await api.get("/social-wall/posts?status=approved");
      setPosts(data.posts || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load social wall.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden p-6">
      <div className="neon-orb left-10 top-24 h-52 w-52 bg-cyan-400/60" />
      <div className="neon-orb right-10 top-40 h-64 w-64 bg-fuchsia-500/50" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-panel mb-6 p-6"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Live Experience</p>
          <h1 className="mt-2 text-3xl font-bold text-cyan-200 md:text-4xl">Anveshana Social Live Wall</h1>
          <p className="mt-2 text-slate-300">Auto-refreshing approved attendee posts in a cinematic event display.</p>
        </motion.div>

        {loading && <p className="mt-6 text-slate-400">Loading live wall...</p>}
        {error && <p className="mt-4 text-rose-400">{error}</p>}

        <div className="space-3d mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.35 }}
              className="scan-line tilt-3d relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-slate-950/60 transition"
            >
              <img
                src={resolveAssetUrl(post.imageUrl)}
                alt={post.caption || "event post"}
                className="h-56 w-full rounded-lg object-cover"
              />
              <p className="mt-3 text-sm text-slate-200">{post.caption || "#AnveshanaAI"}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
