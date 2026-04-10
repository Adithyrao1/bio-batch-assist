import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sprout, Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggleFloat } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
        label: "rgba(255,255,255,0.55)",
        inputBg: "rgba(255,255,255,0.05)",
        inputBorder: "rgba(255,255,255,0.10)",
        inputFocusBorder: "rgba(124,58,237,0.7)",
        inputText: "#ffffff",
        inputPlaceholder: "rgba(255,255,255,0.25)",
        iconColor: "rgba(255,255,255,0.3)",
        iconHover: "rgba(255,255,255,0.6)",
        footerText: "rgba(255,255,255,0.4)",
      }
    : {
        bg: "#f5f4ff",
        card: "rgba(255,255,255,0.85)",
        cardBorder: "rgba(124,58,237,0.12)",
        cardShadow: "0 24px 60px rgba(100,80,200,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        title: "#1a1035",
        subtitle: "#6b7280",
        label: "#6b7280",
        inputBg: "#ffffff",
        inputBorder: "rgba(0,0,0,0.12)",
        inputFocusBorder: "rgba(124,58,237,0.7)",
        inputText: "#1a1035",
        inputPlaceholder: "#9ca3af",
        iconColor: "#9ca3af",
        iconHover: "#7c3aed",
        footerText: "#9ca3af",
      };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email";
    if (!password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast({ title: "Welcome back! 👋", description: "You are now logged in." });
        navigate("/dashboard");
      } else {
        toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Login failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
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
          className="rounded-3xl p-8 transition-all duration-300"
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
            <p className="text-sm mt-1 transition-colors" style={{ color: t.subtitle }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider transition-colors" style={{ color: t.label }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors" style={{ color: t.iconColor }} />
                <input
                  type="email"
                  value={email}
                  autoFocus
                  onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: errors.email ? (isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)") : t.inputBg,
                    border: `1px solid ${errors.email ? "rgba(239,68,68,0.5)" : t.inputBorder}`,
                    color: t.inputText,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = t.inputFocusBorder)}
                  onBlur={(e) => (e.target.style.borderColor = errors.email ? "rgba(239,68,68,0.5)" : t.inputBorder)}
                />
                <style>{`input::placeholder { color: ${t.inputPlaceholder}; }`}</style>
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-xs text-red-500 mt-1.5">{errors.email}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider transition-colors" style={{ color: t.label }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors" style={{ color: t.iconColor }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: errors.password ? (isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)") : t.inputBg,
                    border: `1px solid ${errors.password ? "rgba(239,68,68,0.5)" : t.inputBorder}`,
                    color: t.inputText,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = t.inputFocusBorder)}
                  onBlur={(e) => (e.target.style.borderColor = errors.password ? "rgba(239,68,68,0.5)" : t.inputBorder)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: t.iconColor }}
                  onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = t.iconHover)}
                  onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = t.iconColor)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-xs text-red-500 mt-1.5">{errors.password}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Forgot password */}
            <div className="text-right -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-violet-500 hover:text-violet-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 mt-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm transition-colors" style={{ color: t.footerText }}>
            Don't have an account?{" "}
            <Link to="/signup" className="text-violet-500 hover:text-violet-400 font-medium transition-colors">
              Create one
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
