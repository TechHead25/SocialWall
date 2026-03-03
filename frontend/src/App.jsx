import { Link, Navigate, Route, Routes } from "react-router-dom";
import { motion } from "framer-motion";
import AdminLayout from "./layouts/AdminLayout";
import SocialWallScreen from "./pages/public/SocialWallScreen";
import PhotoBoothPage from "./pages/public/PhotoBoothPage";
import UploadKnowledge from "./pages/admin/UploadKnowledge";
import UploadVideo from "./pages/admin/UploadVideo";
import ModeratePosts from "./pages/admin/ModeratePosts";
import Analytics from "./pages/admin/Analytics";
import { ADMIN_BASE_PATH } from "./constants/routes";

function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
      >
        <p className="font-semibold tracking-wide text-cyan-300">Anveshana AI Event Platform</p>
        <nav className="flex gap-4 text-sm">
          <Link className="rounded-full border border-transparent px-3 py-1 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300" to="/">
            Social Wall
          </Link>
          <Link
            className="rounded-full border border-transparent px-3 py-1 text-slate-300 transition hover:border-fuchsia-300/40 hover:text-fuchsia-300"
            to="/photo-booth"
          >
            Photo Booth
          </Link>
        </nav>
      </motion.div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <PublicNav />
              <SocialWallScreen />
            </>
          }
        />
        <Route
          path="/photo-booth"
          element={
            <>
              <PublicNav />
              <PhotoBoothPage />
            </>
          }
        />

        <Route path={ADMIN_BASE_PATH} element={<AdminLayout />}>
          <Route index element={<Navigate to="knowledge" replace />} />
          <Route path="knowledge" element={<UploadKnowledge />} />
          <Route path="video" element={<UploadVideo />} />
          <Route path="moderate" element={<ModeratePosts />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

        <Route path="/admin/*" element={<Navigate to={ADMIN_BASE_PATH} replace />} />
      </Routes>
    </>
  );
}
