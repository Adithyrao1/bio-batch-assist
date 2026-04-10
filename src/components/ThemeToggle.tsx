import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative h-8 w-8 rounded-full flex items-center justify-center transition-colors
        hover:bg-primary/10 text-muted-foreground hover:text-primary ${className}`}
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </motion.div>
    </motion.button>
  );
}

/** Floating glass pill variant — used on auth pages */
export function ThemeToggleFloat() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)",
        color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
      }}
      aria-label="Toggle theme"
    >
      {isDark
        ? <><Sun className="h-3.5 w-3.5" /> Light</>
        : <><Moon className="h-3.5 w-3.5" /> Dark</>
      }
    </motion.button>
  );
}
