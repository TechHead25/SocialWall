import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, resolveAssetUrl } from "../../lib/api";

export default function ModeratePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/social-wall/posts?status=pending");
      setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  };

  const moderate = async (id, status) => {
    await api.patch(`/social-wall/posts/${id}/moderate`, { status });
    fetchPending();
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-6"
    >
      <h1 className="text-2xl font-semibold text-cyan-300">Moderate Posts</h1>
      {loading && <p className="mt-3 text-slate-400">Loading pending posts...</p>}

      <div className="space-3d mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="tilt-3d rounded-lg border border-white/10 bg-white/[0.04] p-3 transition">
            <img
              src={resolveAssetUrl(post.imageUrl)}
              alt={post.caption || "pending"}
              className="h-48 w-full rounded-md object-cover"
            />
            <p className="mt-2 text-sm">{post.caption || "No caption"}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" onClick={() => moderate(post.id, "approved")}>
                Approve
              </button>
              <button className="btn-ghost" onClick={() => moderate(post.id, "rejected")}>
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && posts.length === 0 && <p className="mt-4 text-slate-400">No pending posts.</p>}
    </motion.section>
  );
}
