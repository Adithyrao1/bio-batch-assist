import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Bug,
  FlaskConical,
  Thermometer,
  Scissors,
  Beaker,
  FileWarning,
  Sprout,
  Database,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

// ─── nav item color tokens ────────────────────────────────────────────────────
// Each module gets a unique accent so the active pill feels "owned" by that page
const NAV_ITEMS = [
  { title: "Dashboard",                url: "/dashboard",                icon: LayoutDashboard, accent: "from-violet-500 to-indigo-500",  ring: "ring-violet-400/40",  dot: "bg-violet-400",  activeBg: "bg-violet-50 dark:bg-violet-900/25",  activeText: "text-violet-700 dark:text-violet-300" },
  { title: "Contamination Monitoring", url: "/contamination-monitoring", icon: Bug,             accent: "from-teal-500 to-cyan-500",      ring: "ring-teal-400/40",    dot: "bg-teal-400",    activeBg: "bg-teal-50 dark:bg-teal-900/25",      activeText: "text-teal-700 dark:text-teal-300" },
  { title: "Media Preparation",        url: "/media-preparation",        icon: FlaskConical,    accent: "from-amber-500 to-orange-500",   ring: "ring-amber-400/40",   dot: "bg-amber-400",   activeBg: "bg-amber-50 dark:bg-amber-900/25",    activeText: "text-amber-700 dark:text-amber-300" },
  { title: "Growth Room",              url: "/growth-room",              icon: Thermometer,     accent: "from-emerald-500 to-green-500",  ring: "ring-emerald-400/40", dot: "bg-emerald-400", activeBg: "bg-emerald-50 dark:bg-emerald-900/25",activeText: "text-emerald-700 dark:text-emerald-300" },
  { title: "Inoculation Room",         url: "/inoculation-room",         icon: Scissors,        accent: "from-indigo-500 to-violet-500",  ring: "ring-indigo-400/40",  dot: "bg-indigo-400",  activeBg: "bg-indigo-50 dark:bg-indigo-900/25",  activeText: "text-indigo-700 dark:text-indigo-300" },
  { title: "Chemicals",                url: "/chemicals",                icon: Beaker,          accent: "from-rose-500 to-red-500",       ring: "ring-rose-400/40",    dot: "bg-rose-400",    activeBg: "bg-rose-50 dark:bg-rose-900/25",      activeText: "text-rose-700 dark:text-rose-300" },
  { title: "Contamination Reports",    url: "/contamination-reports",    icon: FileWarning,     accent: "from-purple-500 to-fuchsia-500", ring: "ring-purple-400/40",  dot: "bg-purple-400",  activeBg: "bg-purple-50 dark:bg-purple-900/25",  activeText: "text-purple-700 dark:text-purple-300" },
  { title: "Greenhouse",               url: "/greenhouse",               icon: Sprout,          accent: "from-lime-500 to-green-500",     ring: "ring-lime-400/40",    dot: "bg-lime-400",    activeBg: "bg-lime-50 dark:bg-lime-900/25",      activeText: "text-lime-700 dark:text-lime-300" },
] as const;

const ADMIN_ITEMS = [
  { title: "Master Data", url: "/master-data", icon: Database, accent: "from-slate-500 to-zinc-500", ring: "ring-slate-400/40", dot: "bg-slate-400", activeBg: "bg-slate-100 dark:bg-slate-800/50", activeText: "text-slate-700 dark:text-slate-300" },
  { title: "Users",       url: "/users",       icon: Users,    accent: "from-sky-500 to-blue-500",   ring: "ring-sky-400/40",   dot: "bg-sky-400",   activeBg: "bg-sky-50 dark:bg-sky-900/25",      activeText: "text-sky-700 dark:text-sky-300" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number] | (typeof ADMIN_ITEMS)[number];

// ─── single nav link ──────────────────────────────────────────────────────────
function NavItem({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <RouterNavLink to={item.url} className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl">
      <motion.div
        layout
        className={[
          "relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 group",
          active
            ? `${item.activeBg} ${item.activeText} font-semibold`
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          collapsed ? "justify-center px-2" : "",
        ].join(" ")}
      >
        {/* active left pill */}
        <AnimatePresence>
          {active && !collapsed && (
            <motion.span
              layoutId="active-pill"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b ${item.accent}`}
            />
          )}
        </AnimatePresence>

        {/* icon container */}
        <div className={[
          "relative shrink-0 rounded-lg p-1.5 transition-all duration-150",
          active
            ? `bg-gradient-to-br ${item.accent} shadow-sm ${item.ring} ring-1`
            : "bg-transparent group-hover:bg-muted",
        ].join(" ")}>
          <Icon className={[
            "h-3.5 w-3.5 transition-colors duration-150",
            active ? "text-white" : "",
          ].join(" ")} />
        </div>

        {/* label */}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="text-sm truncate"
            >
              {item.title}
            </motion.span>
          )}
        </AnimatePresence>

        {/* collapsed tooltip dot */}
        {collapsed && active && (
          <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${item.dot} ring-2 ring-background`} />
        )}
      </motion.div>
    </RouterNavLink>
  );
}

// ─── section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 mx-auto w-6 h-px bg-border/60" />;
  return (
    <p className="px-3 mb-1 mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
      {label}
    </p>
  );
}

// ─── main sidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-background/95 dark:bg-background/90 backdrop-blur-xl border-r border-border/50">

        {/* ── Brand header ───────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 p-4 pb-3 ${collapsed ? "justify-center px-2" : ""}`}>
          {/* logo mark */}
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <Sprout className="h-4.5 w-4.5 text-white" />
            </div>
            {/* pulse ring */}
            <span className="absolute inset-0 rounded-xl ring-2 ring-violet-400/30 animate-pulse pointer-events-none" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <p className="text-[11px] font-bold text-foreground leading-tight tracking-tight">
                  DCM SHRIRAM
                </p>
                <p className="text-[10px] font-semibold text-foreground/80 leading-tight">
                  LabNest
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Tissue Culture LIMS</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* divider */}
        <div className={`mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-2`} />

        {/* ── Modules ─────────────────────────────────────────────────── */}
        <div className="px-2 space-y-0.5">
          <SectionLabel label="Modules" collapsed={collapsed} />
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.url} item={item} active={isActive(item.url)} collapsed={collapsed} />
          ))}
        </div>

        {/* ── Administration ──────────────────────────────────────────── */}
        {user?.role === "admin" && (
          <div className="px-2 space-y-0.5 mt-1">
            <SectionLabel label="Administration" collapsed={collapsed} />
            {ADMIN_ITEMS.map((item) => (
              <NavItem key={item.url} item={item} active={isActive(item.url)} collapsed={collapsed} />
            ))}
          </div>
        )}

        {/* ── Bottom version badge ────────────────────────────────────── */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-auto mx-3 mb-3 px-3 py-2 rounded-xl bg-muted/40 border border-border/40"
            >
              <p className="text-[10px] text-muted-foreground/60 text-center">v1.0 · Tissue Culture LIMS</p>
            </motion.div>
          )}
        </AnimatePresence>

      </SidebarContent>
    </Sidebar>
  );
}
