import { Link, NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_BASE_PATH } from "../constants/routes";

const navItems = [
  { to: `${ADMIN_BASE_PATH}/knowledge`, label: "Upload Knowledge" },
  { to: `${ADMIN_BASE_PATH}/video`, label: "Upload Video" },
  { to: `${ADMIN_BASE_PATH}/moderate`, label: "Moderate Posts" },
  { to: `${ADMIN_BASE_PATH}/analytics`, label: "View Analytics" }
];

export default function AdminLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="neon-orb left-8 top-20 h-56 w-56 bg-cyan-500/45" />
      <div className="neon-orb right-8 top-40 h-60 w-60 bg-fuchsia-500/40" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 md:grid-cols-[280px_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-panel h-fit p-5"
        >
          <h2 className="text-lg font-semibold text-cyan-300">Admin Dashboard</h2>
          <div className="mt-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg border px-3 py-2 transition ${
                    isActive
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                      : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/[0.04]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <Link className="mt-5 inline-block text-sm text-slate-400 hover:text-cyan-300" to="/">
            ← Back to Public Screens
          </Link>
        </motion.aside>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
