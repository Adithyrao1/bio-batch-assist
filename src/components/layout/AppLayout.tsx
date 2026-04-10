import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  // blend mode: multiply darkens white bg (shows tint), screen lightens dark bg
  const blend = isDark ? "mix-blend-screen" : "mix-blend-multiply";

  return (
    <SidebarProvider>

      {/* ── Layer 1: dot-grid texture ─────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[-3] pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(139,92,246,0.22) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(99,60,210,0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* ── Layer 2: animated color blobs ────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden">

        {/* A — top-right: violet/indigo */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -35, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-40 -right-20 w-[700px] h-[700px] rounded-full blur-[140px] transition-colors duration-700 ${blend} ${
            isDark ? "bg-violet-800/60" : "bg-violet-300/50"
          }`}
        />

        {/* B — bottom-left: teal/cyan */}
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-40 -left-24 w-[650px] h-[650px] rounded-full blur-[130px] transition-colors duration-700 ${blend} ${
            isDark ? "bg-teal-800/50" : "bg-teal-300/45"
          }`}
        />

        {/* C — center: soft indigo pulse */}
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[160px] transition-colors duration-700 ${blend} ${
            isDark ? "bg-indigo-900/35" : "bg-indigo-200/55"
          }`}
        />

        {/* D — top-left: fuchsia (dark) / amber-rose (light) */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-28 -left-28 w-[550px] h-[550px] rounded-full blur-[120px] transition-colors duration-700 ${blend} ${
            isDark ? "bg-fuchsia-900/45" : "bg-rose-200/40"
          }`}
        />

        {/* E — bottom-right: emerald */}
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-28 -right-20 w-[550px] h-[550px] rounded-full blur-[120px] transition-colors duration-700 ${blend} ${
            isDark ? "bg-emerald-900/40" : "bg-emerald-200/40"
          }`}
        />

        {/* F — mid-right: sky accent (dark only, subtle) */}
        {isDark && (
          <motion.div
            animate={{ y: [0, -60, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full blur-[110px] bg-sky-900/30 mix-blend-screen"
          />
        )}
      </div>

      {/* ── Layer 3: dark-mode radial vignette (depth) ───────────────── */}
      {isDark && (
        <div
          className="fixed inset-0 z-[-1] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)",
          }}
        />
      )}

      {/* ── App shell ────────────────────────────────────────────────── */}
      <div className="min-h-screen flex w-full relative z-0">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background/5">
          <TopBar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>

    </SidebarProvider>
  );
}

