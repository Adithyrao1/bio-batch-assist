import { useNavigate, Link } from "react-router-dom";
import { Sprout, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggleFloat } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { useState } from "react";

export default function Login() {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const t = isDark
    ? {
        bg: "#0a0a12",
        card: "rgba(255,255,255,0.05)",
        cardBorder: "rgba(255,255,255,0.08)",
        cardShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        title: "#ffffff",
        subtitle: "rgba(255,255,255,0.5)",
      }
    : {
        bg: "#f5f4ff",
        card: "rgba(255,255,255,0.85)",
        cardBorder: "rgba(124,58,237,0.12)",
        cardShadow: "0 24px 60px rgba(100,80,200,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        title: "#1a1035",
        subtitle: "#6b7280",
      };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: t.bg }}
    >
      <ThemeToggleFloat />

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full blur-[100px] ${isDark ? "bg-violet-600/20" : "bg-violet-400/15"}`}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-24 -right-24 w-[520px] h-[520px] rounded-full blur-[100px] ${isDark ? "bg-indigo-500/20" : "bg-indigo-300/15"}`}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Glass card */}
        <div
          className="rounded-3xl p-8 transition-all duration-300 text-center"
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: t.cardShadow,
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex flex-col items-center group cursor-pointer hover:opacity-90 transition-opacity">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Sprout className="h-7 w-7 text-white" />
              </motion.div>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight transition-colors" style={{ color: t.title }}>Welcome back</h1>
            <p className="text-sm mt-1 transition-colors" style={{ color: t.subtitle }}>Sign in with your organization account</p>
          </div>

          <motion.button
            onClick={handleLogin}
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 mt-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0078d4, #005a9e)" }}
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting...</> : (
              <>
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                  <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                  <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                  <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                </svg>
                Sign In with Microsoft
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
