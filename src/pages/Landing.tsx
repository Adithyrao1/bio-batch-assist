import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  Tractor,
  ArrowRight,
  Database,
  Activity,
  LineChart,
  GitBranch,
  X,
  Loader2,
  Search,
  BarChart3,
  FlaskConical,
  Mail,
  ShieldCheck,
  Zap,
  Map,
  Users,
  LocateFixed,
  MapPin,
  Bot,
  User,
  CheckCircle2,
  Send
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { Hero3D } from "@/components/ui/Hero3D";

export default function Landing() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { instance } = useMsal();
  const { resolvedTheme } = useTheme();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = showLoginModal ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [showLoginModal]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30 overflow-hidden font-sans transition-colors duration-300">

      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="h-10 w-10" rounded="rounded-2xl" />
            <span className="text-xl font-bold tracking-tight">Origin<span className="text-indigo-500">.ai</span></span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setShowLoginModal(true)}
              className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <Hero3D />

        {/* HERO SECTION */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">

          {/* ── Video Background ── */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${resolvedTheme === "dark" ? "invert brightness-[0.35] saturate-50" : "opacity-40"
                }`}
            >
              <source src="/hero-bg.mp4" type="video/mp4" />
            </video>
            {/* Overlay: lightens on light mode, darkens on dark mode */}
            <div className={`absolute inset-0 transition-all duration-500 ${resolvedTheme === "dark"
                ? "bg-background/60"
                : "bg-background/55"
              }`} />
            {/* Fade to background at bottom so sections below blend seamlessly */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-5xl mx-auto"
          >
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-sm font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-8"
            >
              Origin.ai — Agricultural Intelligence Platform
            </motion.p>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8"
            >
              From nucleus.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400">
                To harvest.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto mb-14 leading-relaxed"
            >
              The complete intelligence platform for tissue culture labs
              <br className="hidden md:block" /> and field seed multiplication — in one system.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center gap-4"
            >
              <button
                onClick={() => setShowLoginModal(true)}
                className="group relative px-8 py-4 rounded-full bg-foreground text-background font-semibold text-base transition-all hover:bg-foreground/90 hover:scale-[1.03] active:scale-[0.98] shadow-xl"
              >
                <span className="flex items-center gap-2">
                  Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 rounded-full border border-border text-foreground font-semibold text-base transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98] backdrop-blur-sm"
              >
                Sign In
              </button>
            </motion.div>
          </motion.div>

          {/* Bottom stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-12 text-center z-10"
          >
            {[
              { value: "5", label: "Production Stages" },
              { value: "4-Year", label: "Seed Genealogy" },
              { value: "Real-Time", label: "AI Analytics" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">{stat.label}</span>
              </div>
            ))}
          </motion.div>

        </section>



        {/* LABNEST MODULE */}
        <section className="py-24 px-6 relative border-t border-border/50 bg-muted/20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 shadow-sm border border-violet-500/20">
                <FlaskConical className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">LabNest Module</h2>
              <p className="text-lg text-muted-foreground mb-8">
                The ultimate Tissue Culture LIMS. Streamline your entire laboratory workflow from media preparation to greenhouse transplantation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Activity className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">Complete Stage Tracking</h4>
                  <p className="text-sm text-muted-foreground">Monitor every stage: Initiation, Multiplication, Rooting, Hardening, and Transplantation with exact metrics.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <BarChart3 className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">Cost per Plantlet Analysis</h4>
                  <p className="text-sm text-muted-foreground">Dynamic pro-rating of manpower and chemical expenses to determine precise production costs.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Database className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">Chemical Inventory & Alerts</h4>
                  <p className="text-sm text-muted-foreground">Automated stock deduction, expiry tracking, and scheduled email alerts for low inventory.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <ShieldCheck className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">Role-Based Access (RBAC)</h4>
                  <p className="text-sm text-muted-foreground">Secure your data with strict granular permissions for Technicians, Admins, and Viewers.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Zap className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">Async Background Reports</h4>
                  <p className="text-sm text-muted-foreground">Progress & Expense Excel reports are generated via Background workers for zero-blocking performance.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <LineChart className="h-5 w-5 text-violet-500" />
                  <h4 className="font-bold text-foreground">OLAP-Powered Dashboard</h4>
                  <p className="text-sm text-muted-foreground">Precomputed analytics views ensure lightning-fast dashboard loading speeds.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-[2.5rem] blur-xl opacity-20 -z-10"></div>
              <div className="bg-card border border-border shadow-2xl rounded-3xl p-6 overflow-hidden">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Mail className="h-4 w-4 text-violet-500" /> Weekly Automated Reports</h3>
                  <div className="px-3 py-1 bg-violet-500/10 text-violet-600 rounded-full text-xs font-bold">Scheduled</div>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-xl flex items-start gap-4">
                    <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                      <LineChart className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Progress Report Generated</p>
                      <p className="text-xs text-muted-foreground mt-1">Background task completed in 1.2s. Email dispatched successfully to Manager.</p>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl flex items-start gap-4">
                    <div className="h-10 w-10 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                      <Activity className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Expiry Alert Dispatched</p>
                      <p className="text-xs text-muted-foreground mt-1">2 chemicals expiring in 30 days. Auto-email sent to Procurement.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FIELDLINK MODULE */}
        <section className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
            <div className="flex-1 w-full relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur-xl opacity-20 -z-10"></div>
              <div className="bg-card border border-border shadow-2xl rounded-3xl overflow-hidden">
                <img
                  src="/fieldlink_plot_map.png"
                  alt="Live satellite plot view with polygon boundary and lot popup"
                  className="w-full h-auto block"
                  style={{ display: "block", maxHeight: "480px", objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-sm border border-emerald-500/20">
                <Tractor className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">FieldLink Module</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Take plantlets into the soil with complete visibility. Monitor the massive 4-year seed multiplication cycle using satellite mapping and strict parent-child tracking.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Database className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-bold text-foreground">Seed Lot Registry</h4>
                  <p className="text-sm text-muted-foreground">Manage lots, partial dispatches, harvests, and stage progression from Breeder to Commercial.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <GitBranch className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-bold text-foreground">Genealogy Tracer</h4>
                  <p className="text-sm text-muted-foreground">Visually trace commercial seeds back through their lineage straight to the exact lab tissue culture batch.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Map className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-bold text-foreground">Geo-Spatial Map View</h4>
                  <p className="text-sm text-muted-foreground">Interactive satellite maps to locate plots, view active lots, adjust boundaries, and auto-calculate acreage.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-bold text-foreground">Farmer Registry & Rating</h4>
                  <p className="text-sm text-muted-foreground">Maintain a database of contract farmers and automatically rate them based on multiplication ratios.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI ASSISTANT SHOWCASE */}
        <section className="py-24 px-6 border-t border-border/50 bg-indigo-950/5 dark:bg-indigo-900/10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl mb-6">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-sm font-semibold">
              <GitBranch className="h-4 w-4" /> Powered by LangGraph Multi-Agent Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Talk to your enterprise data.</h2>
            <p className="text-xl text-muted-foreground">
              Origin AI operates seamlessly across both LabNest and FieldLink. With session-aware memory, it remembers the context of your daily workflow. Stop wrestling with spreadsheets—just ask in plain English and get instant, board-ready insights.
            </p>
          </div>

          {/* ── Chat Window Mockup ── */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden hover:shadow-indigo-500/10 transition-shadow duration-500">

              {/* Chat Header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 border-b border-white/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">Origin<span className="text-indigo-200">.AI</span></p>
                  <p className="text-[11px] text-white/60 mt-0.5">Your end-to-end lab intelligence assistant</p>
                </div>
                <div className="ml-auto flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-[11px] font-semibold text-white/80">Live</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-5 p-6 bg-background/50">

                {/* ── Turn 1: Visualization ── */}
                {/* User */}
                <div className="flex items-end gap-3 flex-row-reverse">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[72%] rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 py-3 text-sm shadow">
                    Show me a pie chart of contamination events by variety this month
                  </div>
                </div>
                {/* AI */}
                <div className="flex items-end gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 shadow">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm shadow-sm space-y-3">
                    <p className="text-muted-foreground text-xs font-medium">Here is the contamination breakdown for this month:</p>
                    {/* Mini Pie Chart */}
                    <div className="flex items-center gap-5 p-3 bg-muted/40 rounded-xl border border-border/40">
                      <div
                        className="w-16 h-16 rounded-full flex-shrink-0 shadow-inner"
                        style={{ background: "conic-gradient(#6366f1 0% 45%, #10b981 45% 75%, #8b5cf6 75% 100%)" }}
                      />
                      <div className="flex flex-col gap-1.5 text-xs text-foreground">
                        <div className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0"></div> Co-0238 — <span className="font-bold">45%</span></div>
                        <div className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></div> Co-0118 — <span className="font-bold">30%</span></div>
                        <div className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0"></div> Others — <span className="font-bold">25%</span></div>
                      </div>
                    </div>
                    <p className="text-foreground/80">Co-0238 leads contamination this month at 45%, primarily due to fungal infections in Growth Room B.</p>
                  </div>
                </div>

                {/* ── Turn 2: Cross-Module ── */}
                {/* User */}
                <div className="flex items-end gap-3 flex-row-reverse">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[72%] rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 py-3 text-sm shadow">
                    How many plantlets from LabNest were dispatched to Loni this season?
                  </div>
                </div>
                {/* AI */}
                <div className="flex items-end gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 shadow">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm shadow-sm space-y-2">
                    <p className="text-foreground/80">Here's the <span className="font-semibold text-emerald-600 dark:text-emerald-400">LabNest → Loni</span> pipeline for this season:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/40 rounded-lg p-2 text-center border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Initiated</p>
                        <p className="text-base font-bold text-foreground">14,200</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Hardened</p>
                        <p className="text-base font-bold text-emerald-600">11,500</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Dispatched</p>
                        <p className="text-base font-bold text-indigo-600">11,500</p>
                      </div>
                    </div>
                    <p className="text-foreground/70 text-xs">All hardened plantlets were successfully dispatched to Loni fields for multiplication.</p>
                  </div>
                </div>

                {/* ── Turn 3: Report Generation ── */}
                {/* User */}
                <div className="flex items-end gap-3 flex-row-reverse">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[72%] rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 py-3 text-sm shadow">
                    Hey, can you create a progress report and expense report for this season and send it to my manager?
                  </div>
                </div>
                {/* AI */}
                <div className="flex items-end gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 shadow">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm shadow-sm space-y-3">
                    <p className="text-foreground/80">On it! Here's what I did:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span>Progress Report compiled for Season 2025-26</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span>Expense Report compiled — Total: ₹4,18,200</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80">
                        <Mail className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <span>Both reports emailed to <span className="font-semibold text-foreground">manager@dcmshriram.com</span></span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs border-t border-border/40 pt-2">Reports were generated in the background and delivered without disrupting your workflow.</p>
                  </div>
                </div>

              </div>

              {/* Fake Input Bar */}
              <div className="px-5 py-4 border-t border-border bg-background/70 backdrop-blur-sm">
                <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-4 py-2.5">
                  <span className="flex-1 text-sm text-muted-foreground/50">Ask a question about your data…</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                    <Send className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        {/* Gradient accent line at top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, staggerChildren: 0.1 }}
          className="max-w-7xl mx-auto px-6 py-14"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

            {/* Brand Column */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <BrandLogo size="h-9 w-9" rounded="rounded-xl" />
                <span className="text-lg font-bold tracking-tight">Origin<span className="text-indigo-500">.ai</span></span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                End-to-end intelligence platform for seed production — from tissue culture to field harvest.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">All systems operational</span>
              </div>
            </div>

            {/* LabNest Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-foreground">LabNest</h4>
              </div>
              {[
                "Production Dashboard",
                "Daily Production Log",
                "Chemical Inventory",
                "Expense Tracking",
                "Progress Reports",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {item}
                </button>
              ))}
            </div>

            {/* FieldLink Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Tractor className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-foreground">FieldLink</h4>
              </div>
              {[
                "Seed Lot Registry",
                "Plot Satellite Map",
                "Genealogy Tracer",
                "Farmer Registry",
                "Dispatch & Harvest",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Origin.AI Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-purple-500" />
                <h4 className="text-sm font-bold text-foreground">Origin.AI</h4>
              </div>
              {[
                "AI Assistant",
                "Session-Aware AI Memory",
                "Multi-Agent Supervisor",
                "Dynamic Visualizations",
                "Automated Reporting",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {item}
                </button>
              ))}
            </div>

          </div>

          {/* Divider */}
          <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} <span className="font-semibold text-foreground">DCM Shriram Ltd.</span> — Origin.ai Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secured with Microsoft Azure AD · Role-Based Access Control</span>
            </div>
          </div>
        </motion.div>
      </footer>

      {/* LOGIN MODAL */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center mb-8 pt-4">
                <BrandLogo size="h-16 w-16" rounded="rounded-2xl" className="mb-6 shadow-lg" />
                <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to Origin.ai</h2>
                <p className="text-sm text-muted-foreground text-center">Sign in to access LabNest, FieldLink, and the AI Assistant.</p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#006cbd] shadow-md"
              >
                {isLoggingIn ? <><Loader2 className="h-5 w-5 animate-spin" /> Authenticating...</> : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                      <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                      <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                      <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                    </svg>
                    Continue with Microsoft
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
