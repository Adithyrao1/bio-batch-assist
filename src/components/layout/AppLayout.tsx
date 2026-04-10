import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <SidebarProvider>
      {/* Global ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen transition-colors ${
            isDark ? "bg-indigo-900/40" : "bg-indigo-300/40"
          }`}
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen transition-colors ${
            isDark ? "bg-blue-900/30" : "bg-blue-200/50"
          }`}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[140px] mix-blend-screen transition-colors ${
            isDark ? "bg-indigo-800/20" : "bg-blue-300/30"
          }`}
        />
      </div>

      <div className="min-h-screen flex w-full relative z-0">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background/20 backdrop-blur-[2px]">
          <TopBar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

