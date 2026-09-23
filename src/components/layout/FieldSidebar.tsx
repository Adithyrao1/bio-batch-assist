import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Tractor,
  Users,
  TreeDeciduous,
  MapPin,
  Satellite,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/field", icon: LayoutDashboard },
  { title: "Seed Lots", url: "/field/lots", icon: TreeDeciduous },
  { title: "Farmers & Field Mgrs", url: "/field/farmers", icon: Users },
  { title: "Genealogy Tracer", url: "/field/genealogy", icon: Tractor },
  { title: "Plot Map View", url: "/field/map", icon: Satellite },
];

const ADMIN_NAV_ITEMS: { title: string; url: string; icon: any }[] = [];

function NavItem({ item, active, collapsed }: { item: any; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <RouterNavLink to={item.url} className="block w-full outline-none group mb-1">
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden",
          active 
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="relative z-10 flex items-center justify-center">
          <Icon className={cn("h-5 w-5 transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="relative z-10 text-[13px] whitespace-nowrap overflow-hidden"
            >
              {item.title}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </RouterNavLink>
  );
}

export function FieldSidebar() {
  const { state, setOpen } = useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  // Keep sidebar open by default on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(true);
      else setOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return (
    <Sidebar className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 shrink-0 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-inner">
            <Tractor className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg tracking-tight whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
              >
                FieldLink
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SidebarContent className="px-3 py-4 overflow-y-auto no-scrollbar flex-1">
        <div className="space-y-6">
          <div>
            <div className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  active={location.pathname === item.url || (item.url !== "/field" && location.pathname.startsWith(item.url))}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1">Admin</p>
              )}
              <div className="flex flex-col">
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.url}
                    item={item}
                    active={location.pathname.startsWith(item.url)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SidebarContent>

      <div className="p-4 border-t border-border/50">
        <button
          onClick={() => navigate("/launchpad")}
          className={cn(
            "flex items-center gap-3 w-full p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          {!collapsed && <span className="text-sm font-medium">Back to Launchpad</span>}
        </button>
      </div>
    </Sidebar>
  );
}
