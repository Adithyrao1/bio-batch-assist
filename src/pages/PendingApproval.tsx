import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggleFloat } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { LogOut, Clock, ShieldAlert } from "lucide-react";
import { useMsal } from "@azure/msal-react";

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const { instance } = useMsal();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const t = isDark
    ? {
        bg: "#0a0a12",
        card: "rgba(255,255,255,0.03)",
        cardBorder: "rgba(255,255,255,0.08)",
        title: "#ffffff",
        subtitle: "rgba(255,255,255,0.6)",
      }
    : {
        bg: "#f8f9fc",
        card: "rgba(255,255,255,0.8)",
        cardBorder: "rgba(0,0,0,0.08)",
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
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-0 right-[20%] w-[400px] h-[400px] rounded-full blur-[100px] ${isDark ? "bg-orange-500/10" : "bg-orange-300/20"}`}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-[2rem] p-10 flex flex-col items-center text-center border backdrop-blur-xl shadow-xl"
          style={{
            background: t.card,
            borderColor: t.cardBorder,
          }}
        >
          <div className="flex justify-center mb-8">
            <BrandLogo size="h-16 w-16" rounded="rounded-2xl" />
          </div>

          <div className="h-20 w-20 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
            <Clock className="h-10 w-10" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3" style={{ color: t.title }}>
            Pending Approval
          </h1>
          
          <p className="text-base leading-relaxed mb-6" style={{ color: t.subtitle }}>
            Welcome, <strong>{user?.name || "User"}</strong>! Your account has been successfully created and is waiting for administrator approval.
          </p>

          <div className="w-full p-4 rounded-xl flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 text-left mb-8">
            <ShieldAlert className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-600 dark:text-blue-400">
              An administrator needs to assign your role (Technician or Admin) before you can access the platform. Please check back later or contact your manager.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl border-2 hover:bg-muted/50 transition-colors font-bold text-sm"
            style={{ borderColor: t.cardBorder, color: t.title }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
