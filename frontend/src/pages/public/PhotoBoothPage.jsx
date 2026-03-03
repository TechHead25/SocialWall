import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/api";

const styleCards = [
  {
    id: "futuristic engineer",
    title: "Futuristic Engineer",
    description: "Clean pro-tech portrait with holographic lighting"
  },
  {
    id: "space scientist",
    title: "Space Scientist",
    description: "Aerospace-inspired research look with cosmic ambience"
  },
  {
    id: "cyberpunk innovator",
    title: "Cyberpunk Innovator",
    description: "High-contrast neon editorial style"
  }
];

export default function PhotoBoothPage() {
  const [style, setStyle] = useState(styleCards[0].id);
  const [photo, setPhoto] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [inputPreview, setInputPreview] = useState("");
  const [provider, setProvider] = useState("");
  const [providerPreference, setProviderPreference] = useState("gemini");
  const [intensity, setIntensity] = useState(0.78);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const styleMeta = useMemo(() => styleCards.find((item) => item.id === style), [style]);

  useEffect(() => {
    if (!photo) {
      setInputPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(photo);
    setInputPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  const generateAvatar = async () => {
    if (!photo) return setError("Please select a photo first.");

    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("style", style);
    formData.append("providerPreference", providerPreference);
    formData.append("intensity", String(intensity));

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/photo-booth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAvatarUrl(data.imageUrl);
      setProvider(data.provider || "unknown");
    } catch (err) {
      setError(err.response?.data?.error || "Avatar generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8">
      <div className="neon-orb left-8 top-20 h-60 w-60 bg-cyan-500/50" />
      <div className="neon-orb right-12 top-36 h-64 w-64 bg-fuchsia-500/40" />
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-panel mb-6 p-6"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Anveshana AI Studio</p>
          <h1 className="mt-2 text-3xl font-bold text-fuchsia-200 md:text-4xl">Professional AI Photo Booth</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Upload a clear portrait and generate a stage-ready avatar with Gemini Nano Banana styling and advanced
            intensity controls.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="glass-panel space-y-5 p-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Upload Portrait</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
              <p className="mt-2 text-xs text-slate-400">Best result: front-facing image with clear face lighting.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-200">Style Preset</p>
              <div className="space-y-2">
                {styleCards.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      style === item.id
                        ? "border-cyan-400 bg-cyan-500/12"
                        : "border-white/10 bg-white/[0.02] hover:border-slate-400"
                    }`}
                    onClick={() => setStyle(item.id)}
                  >
                    <p className="font-medium text-slate-100">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">AI Provider</label>
              <select
                className="input"
                value={providerPreference}
                onChange={(e) => setProviderPreference(e.target.value)}
              >
                <option value="gemini">Gemini Nano Banana (Recommended)</option>
                <option value="diffusers">Stable Diffusion (Local)</option>
                <option value="auto">Auto Select</option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label className="font-medium text-slate-200">Transformation Intensity</label>
                <span className="text-cyan-300">{intensity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.35"
                max="0.95"
                step="0.01"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <p className="mt-1 text-xs text-slate-400">Higher values create stronger stylization changes.</p>
            </div>

            <button className="btn-primary w-full" disabled={loading} onClick={generateAvatar}>
              {loading ? "Generating Professional Avatar..." : "Generate Professional Avatar"}
            </button>

            {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-panel p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-300">Preview Studio</h2>
                <p className="text-sm text-slate-400">{styleMeta?.title}</p>
              </div>
              {provider && <p className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Provider: {provider}</p>}
            </div>

            <div className="space-3d mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="tilt-3d glass-soft rounded-xl p-3 transition">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Original</p>
                {inputPreview ? (
                  <img src={inputPreview} alt="Uploaded portrait" className="h-[360px] w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">
                    Upload a portrait to preview
                  </div>
                )}
              </div>

              <div className="tilt-3d glass-soft rounded-xl p-3 transition">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">AI Avatar</p>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Generated engineer avatar" className="h-[360px] w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">
                    Generated avatar appears here
                  </div>
                )}
              </div>
            </div>

            {avatarUrl && (
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="btn-primary" href={avatarUrl} target="_blank" rel="noreferrer">
                  Open Full Image
                </a>
                <a className="btn-ghost" href={avatarUrl} download>
                  Download Avatar
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
