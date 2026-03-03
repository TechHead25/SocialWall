import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, jobsRes] = await Promise.all([
        api.get("/social-wall/analytics"),
        api.get("/highlights/jobs")
      ]);
      setMetrics(analyticsRes.data);
      setJobs(jobsRes.data.jobs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <section className="glass-panel p-6">Loading analytics...</section>;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-semibold text-cyan-300">Event Analytics</h1>
        <div className="space-3d mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(metrics || {}).map(([label, value], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              className="tilt-3d rounded-lg border border-white/10 bg-white/[0.04] p-3"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-semibold text-cyan-300">{value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-fuchsia-300">Highlights Jobs</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {jobs.slice(0, 8).map((job) => (
            <li key={job.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              {new Date(job.createdAt).toLocaleString()} — {job.output?.highlights?.length || 0} highlights
            </li>
          ))}
          {jobs.length === 0 && <li>No jobs yet.</li>}
        </ul>
      </div>
    </motion.section>
  );
}
