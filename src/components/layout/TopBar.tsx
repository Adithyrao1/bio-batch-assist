import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, Mail, ChevronDown, CircleDot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  technician: "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  viewer: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayName = user?.name === "Dr. Sarah Chen" ? "Vineeta Raina" : (user?.name ?? "");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-7 w-7" />
        {/* Breadcrumb placeholder / page indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground ml-1">

          <span className="font-medium text-foreground">DCM LabNest</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {user && (
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => setOpen((o) => !o)}
              className={[
                "flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-sm text-sm transition-colors duration-150",
                "border border-border bg-background hover:bg-muted",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                open ? "bg-muted" : "",
              ].join(" ")}
            >
              <UserAvatar name={displayName} profilePicture={user.profile_picture} size="sm" />
              <span className="font-medium text-foreground hidden sm:block max-w-[110px] truncate text-xs">
                {displayName}
              </span>
              <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold capitalize ${ROLE_BADGE[user.role] ?? ROLE_BADGE.viewer}`}>
                {user.role}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-sm border border-border bg-card shadow-lg overflow-hidden z-50"
                >
                  {/* Profile header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar name={displayName} profilePicture={user.profile_picture} size="lg" />
                        <span className="absolute bottom-0.5 right-0.5 block w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </p>
                        <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold capitalize ${ROLE_BADGE[user.role] ?? ROLE_BADGE.viewer}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => { setOpen(false); navigate("/profile"); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span>My Profile</span>
                    </button>
                  </div>

                  <div className="p-1 border-t border-border">
                    <button
                      onClick={() => { setOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
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
