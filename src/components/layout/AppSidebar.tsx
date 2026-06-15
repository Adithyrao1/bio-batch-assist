import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FlaskConical,
  Beaker,
  Sprout,
  Database,
  Users,
  ChevronDown,
  Layers,
  Leaf,
  Sun,
  ArrowUpRight,
  DollarSign,
  Activity,
  HardHat,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Daily Production",
    url: "/daily-production",
    icon: Activity,
    subItems: [
      { title: "Initiation",      url: "/daily-production?stage=initiation",      icon: FlaskConical },
      { title: "Multiplication",  url: "/daily-production?stage=multiplication",  icon: Layers },
      { title: "Rooting",         url: "/daily-production?stage=rooting",         icon: Leaf },
      { title: "Hardening",       url: "/daily-production?stage=hardening",       icon: Sun },
      { title: "Transplantation", url: "/daily-production?stage=transplantation", icon: ArrowUpRight },
    ],
  },
  { title: "Chemicals & Stocks", url: "/chemicals",  icon: Beaker },
  { title: "Expenses & Costing", url: "/expenses",   icon: DollarSign },
];

const ADMIN_ITEMS = [
  { title: "Master Data", url: "/master-data", icon: Database },
  { title: "Users",       url: "/users",       icon: Users },
  { title: "Manpower",   url: "/manpower",    icon: HardHat },
];

type NavItemType = any;

function NavItem({ item, active, collapsed }: { item: NavItemType; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => location.pathname.startsWith(item.url));

  useEffect(() => {
    if (location.pathname.startsWith(item.url)) setIsOpen(true);
  }, [location.pathname, item.url]);

  const hasSubItems = !!item.subItems;

  const content = (
    <div
      className={[
        "relative flex items-center gap-2.5 px-3 py-2 rounded-sm transition-colors duration-100 group cursor-pointer text-sm",
        active
          ? "bg-[hsl(var(--sidebar-accent))] text-white font-medium border-l-2 border-[hsl(var(--sidebar-primary))]"
          : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]",
        collapsed ? "justify-center px-2" : "",
      ].join(" ")}
    >
      <Icon className={["h-4 w-4 shrink-0 transition-colors duration-100", active ? "text-[hsl(var(--sidebar-primary))]" : "text-[hsl(var(--sidebar-foreground))]/60"].join(" ")} />

      {!collapsed && (
        <span className="truncate flex-1 tracking-tight">{item.title}</span>
      )}

      {hasSubItems && !collapsed && (
        <ChevronDown
          className={["h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground))]/40 transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        />
      )}

      {/* Collapsed active dot */}
      {collapsed && active && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />
      )}
    </div>
  );

  return (
    <div>
      {hasSubItems ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          <RouterNavLink to={item.url} className="block outline-none">{content}</RouterNavLink>
        </div>
      ) : (
        <RouterNavLink to={item.url} className="block outline-none">{content}</RouterNavLink>
      )}

      <AnimatePresence initial={false}>
        {hasSubItems && isOpen && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden ml-4 mt-0.5 border-l border-[hsl(var(--sidebar-border))] pl-3 space-y-0.5"
          >
            {item.subItems.map((subItem: any) => {
              const isSubActive =
                location.pathname + location.search === subItem.url ||
                (location.pathname === "/daily-production" && subItem.url.endsWith("initiation") && !location.search);
              const SubIcon = subItem.icon;
              return (
                <RouterNavLink
                  key={subItem.url}
                  to={subItem.url}
                  className={[
                    "flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors duration-100",
                    isSubActive
                      ? "text-[hsl(var(--sidebar-primary))] font-semibold bg-[hsl(var(--sidebar-accent))]"
                      : "text-[hsl(var(--sidebar-foreground))]/55 hover:text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))]/60",
                  ].join(" ")}
                >
                  <SubIcon className="h-3 w-3 shrink-0" />
                  <span>{subItem.title}</span>
                </RouterNavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-auto w-4 h-px bg-[hsl(var(--sidebar-border))]" />;
  return (
    <p className="px-3 mb-1 mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-foreground))]/35 select-none">
      {label}
    </p>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">

        {/* Brand header */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-[hsl(var(--sidebar-border))] ${collapsed ? "justify-center px-2" : ""}`}>
          <div className="shrink-0 h-8 w-8 rounded-sm bg-[hsl(var(--sidebar-primary))] flex items-center justify-center">
            <Sprout className="h-4 w-4 text-white" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <p className="text-[11px] font-bold text-white leading-tight tracking-wide uppercase">
                  DCM Shriram
                </p>
                <p className="text-[10px] text-[hsl(var(--sidebar-foreground))]/60 leading-tight">
                  LabNest · Tissue Culture LIMS
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modules */}
        <div className="px-2 pt-2 space-y-0.5">
          <SectionLabel label="Modules" collapsed={collapsed} />
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.url} item={item} active={isActive(item.url)} collapsed={collapsed} />
          ))}
        </div>

        {/* Administration */}
        {user?.role === "admin" && (
          <div className="px-2 space-y-0.5">
            <SectionLabel label="Administration" collapsed={collapsed} />
            {ADMIN_ITEMS.map((item) => (
              <NavItem key={item.url} item={item} active={isActive(item.url)} collapsed={collapsed} />
            ))}
          </div>
        )}

        {/* Footer */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-auto px-3 py-3 border-t border-[hsl(var(--sidebar-border))]"
            >
              <p className="text-[10px] text-[hsl(var(--sidebar-foreground))]/30 text-center tracking-wide">
                v1.0 — DCM Shriram Ltd.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </SidebarContent>
    </Sidebar>
  );
}
