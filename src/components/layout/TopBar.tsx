import { useState, useRef, useEffect } from "react";
import { LogOut, Settings as SettingsIcon, Mail, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-300/60 dark:ring-violet-700/60",
  technician: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300/60 dark:ring-blue-700/60",
  viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-gray-300/60 dark:ring-gray-700/60",
};

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayName = user?.name === "Dr. Sarah Chen" ? "Vineeta Raina" : (user?.name ?? "");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <header className="h-14 border-b border-border/50 bg-background/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {user && (
          <div className="relative">
            {/* Avatar trigger chip */}
            <button
              ref={triggerRef}
              onClick={() => setOpen((o) => !o)}
              className={[
                "flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-all duration-200",
                "bg-muted/60 hover:bg-muted border border-border/50 hover:border-border",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                open ? "bg-muted border-border shadow-sm" : "",
              ].join(" ")}
            >
              <UserAvatar
                name={displayName}
                profilePicture={user.profile_picture}
                size="sm"
              />
              <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                {displayName}
              </span>
              <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ROLE_STYLES[user.role] ?? ROLE_STYLES.viewer}`}>
                {user.role}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                >
                  {/* Profile header */}
                  <div className="p-5 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <UserAvatar
                          name={displayName}
                          profilePicture={user.profile_picture}
                          size="lg"
                        />
                        {/* Online dot */}
                        <span className="absolute bottom-0.5 right-0.5 block w-3 h-3 rounded-full bg-green-500 ring-2 ring-background" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </p>
                        <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${ROLE_STYLES[user.role] ?? ROLE_STYLES.viewer}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-2 space-y-0.5">
                    <button
                      onClick={() => { setOpen(false); navigate("/settings"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="px-4 pb-2">
                    <div className="h-px bg-border/60" />
                  </div>

                  <div className="px-2 pb-3">
                    <button
                      onClick={() => { setOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/60 transition-colors">
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
