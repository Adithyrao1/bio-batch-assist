import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

export default function ChatWidget() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip label */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none"
        >
          <div className="hidden group-hover:block mb-1 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg px-3 py-1.5">
            <p className="text-xs font-medium text-foreground whitespace-nowrap">Ask me anything</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* FAB */}
      <div className="group relative">
        {/* Animated ring */}
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-600/30 blur-sm pointer-events-none"
        />

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg px-3 py-1.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <p className="text-xs font-medium text-foreground">Ask me anything</p>
            </div>
          </div>
          <div className="flex justify-end pr-4">
            <div className="h-1.5 w-1.5 rotate-45 bg-card border-r border-b border-border/60 -mt-0.5" />
          </div>
        </div>

        <motion.button
          onClick={() => navigate("/ai-assistant")}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 transition-shadow"
          aria-label="Open Lab AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </motion.button>
      </div>
    </div>
  );
}
