import { useNavigate } from "react-router-dom";
import { Tractor, LogOut, Beaker, Map, Sparkles, Bot, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggleFloat } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useMsal } from "@azure/msal-react";
import { AdminOnboardingPanel } from "@/components/AdminOnboardingPanel";

export default function Launchpad() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { instance } = useMsal();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const t = isDark
    ? {
      bg: "#0a0a12",
      card: "rgba(255,255,255,0.03)",
      cardHover: "rgba(255,255,255,0.06)",
      cardBorder: "rgba(255,255,255,0.08)",
      title: "#ffffff",
      subtitle: "rgba(255,255,255,0.6)",
    }
    : {
      bg: "#f8f9fc",
      card: "rgba(255,255,255,0.8)",
      cardHover: "rgba(255,255,255,1)",
      cardBorder: "rgba(124,58,237,0.1)",
      title: "#1a1035",
      subtitle: "#64748b",
    };

  const handleLogout = async () => {
    logout();
    await instance.logoutPopup();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 overflow-hidden relative"
      style={{ backgroundColor: t.bg }}
    >
      <ThemeToggleFloat />

      {/* Decorative Orbs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-0 right-[10%] w-[500px] h-[500px] rounded-full blur-[120px] ${isDark ? "bg-violet-600/15" : "bg-violet-300/20"}`}
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute bottom-0 left-[10%] w-[600px] h-[600px] rounded-full blur-[140px] ${isDark ? "bg-emerald-600/15" : "bg-emerald-300/20"}`}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-6">
            <BrandLogo size="h-16 w-16" rounded="rounded-2xl" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2" style={{ color: t.title }}>
            Welcome back, {user?.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-lg font-medium" style={{ color: t.subtitle }}>
            Select a module to continue
          </p>
        </motion.div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 w-full px-4">
          
          {/* LabNest Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard")}
            className="group cursor-pointer rounded-[2rem] p-8 flex flex-col h-full border backdrop-blur-xl shadow-xl transition-all"
            style={{
              background: t.card,
              borderColor: t.cardBorder,
            }}
          >
            <div className="h-16 w-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
              <Beaker className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3 transition-colors" style={{ color: t.title }}>
              LabNest
            </h2>
            <p className="text-sm leading-relaxed mb-8 flex-grow" style={{ color: t.subtitle }}>
              Manage tissue culture production, track chemical inventory, monitor contamination, and log daily lab activities.
            </p>
            <div className="flex items-center text-sm font-semibold text-violet-600 dark:text-violet-400 opacity-80 group-hover:opacity-100 transition-opacity">
              Launch Module &rarr;
            </div>
          </motion.div>

          {/* FieldLink Card (Hidden from technicians) */}
          {user?.role !== 'technician' && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/field")}
            className="group cursor-pointer rounded-[2rem] p-8 flex flex-col h-full border backdrop-blur-xl shadow-xl transition-all relative overflow-hidden"
            style={{
              background: t.card,
              borderColor: t.cardBorder,
            }}
          >
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                New
              </span>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <Tractor className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3 transition-colors" style={{ color: t.title }}>
              FieldLink
            </h2>
            <p className="text-sm leading-relaxed mb-8 flex-grow" style={{ color: t.subtitle }}>
              Track seed multiplication from Breeder to Commercial stage. Monitor farmers, plots, locations, and mass balance.
            </p>
            <div className="flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
              Launch Module &rarr;
            </div>
          </motion.div>
          )}

        </div>

        {/* Flowing Connectors to Origin.AI */}
        {user?.role !== 'technician' ? (
          <div className="relative w-full md:h-28 h-12 pointer-events-none z-0">
            <svg className="hidden md:block absolute inset-0 w-full h-full animate-[pulse_6s_infinite_ease-in-out]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {/* Arrow head markers */}
                <marker
                  id="arrow-left"
                  viewBox="0 0 10 10"
                  refX="3"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7c3aed" />
                </marker>
                <marker
                  id="arrow-right"
                  viewBox="0 0 10 10"
                  refX="3"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                </marker>

                <linearGradient id="flow-left" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="flow-right" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Left connection path (Violet - LabNest) */}
              <path
                d="M 26 0 C 26 40, 42 60, 48 94"
                fill="none"
                stroke={isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.12)"}
                strokeWidth="1.5"
                strokeLinecap="round"
                markerEnd="url(#arrow-left)"
              />
              <motion.path
                d="M 26 0 C 26 40, 42 60, 48 94"
                fill="none"
                stroke="url(#flow-left)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 16"
                animate={{ strokeDashoffset: [0, -40] }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "linear",
                }}
              />

              {/* Right connection path (Emerald - FieldLink) */}
              <path
                d="M 74 0 C 74 40, 58 60, 52 94"
                fill="none"
                stroke={isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)"}
                strokeWidth="1.5"
                strokeLinecap="round"
                markerEnd="url(#arrow-right)"
              />
              <motion.path
                d="M 74 0 C 74 40, 58 60, 52 94"
                fill="none"
                stroke="url(#flow-right)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 16"
                animate={{ strokeDashoffset: [0, -40] }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "linear",
                }}
              />
            </svg>
          </div>
        ) : (
          <div className="w-full h-8 md:h-12" />
        )}

        {/* Admin Onboarding Panel */}
        {user?.role === 'admin' && <AdminOnboardingPanel />}

        {/* Origin.AI Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="w-full px-4"
        >
          <div
            className="relative w-full rounded-[2rem] overflow-hidden border cursor-pointer group"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 50%, rgba(16,185,129,0.08) 100%)"
                : "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(79,70,229,0.06) 50%, rgba(16,185,129,0.04) 100%)",
              borderColor: isDark ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.15)",
            }}
            onClick={() => navigate("/ai-assistant")}
          >
            {/* Animated glow orbs inside the banner */}
            <motion.div
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-[20%] w-64 h-64 rounded-full blur-[80px] pointer-events-none"
              style={{ background: isDark ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.1)" }}
            />
            <motion.div
              animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-0 left-[10%] w-48 h-48 rounded-full blur-[60px] pointer-events-none"
              style={{ background: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.08)" }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-7">
              {/* Left — Identity */}
              <div className="flex items-center gap-5">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex-shrink-0"
                >
                  <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-2xl" />
                  <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                </motion.div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-extrabold tracking-tight" style={{ color: t.title }}>
                      Origin<span className="text-violet-500">.AI</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-500 border border-violet-500/20">
                      Beta
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: t.subtitle }}>
                    Your end-to-end AI assistant — production analytics, contamination trends,
                    expenses, seed traceability &amp; more.
                  </p>
                </div>
              </div>

              {/* Right — CTA */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); navigate("/ai-assistant"); }}
                className="flex-shrink-0 flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg shadow-violet-500/30 transition-all group-hover:shadow-violet-500/50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Sparkles className="h-4 w-4" />
                Open Origin.AI
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Footer / User controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex items-center gap-4"
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </motion.div>

      </div>
    </div>
  );
}
