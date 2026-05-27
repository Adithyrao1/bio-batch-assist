import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  FlaskConical,
  BarChart3,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Bot,
  Sparkles,
  Database,
  MessageSquareText,
  X,
  Loader2,
  PieChart,
  FileText,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";

const features = [
  {
    icon: Bot,
    title: "Autonomous AI Agent",
    description: "Powered by LangChain and Llama 3.1 to reason, query, and take action autonomously.",
    highlight: true,
  },
  {
    icon: PieChart,
    title: "Dynamic Data Visualization",
    description: "Instantly generate premium, interactive graphs and charts from your lab data via natural language.",
  },
  {
    icon: FileText,
    title: "Knowledge Base Retrieval",
    description: "RAG pipeline connected to Azure Blob Storage to query massive SOP and MSDS documents instantly.",
  },
  {
    icon: Mail,
    title: "Automated Email Agent",
    description: "Ask the AI to automatically compile and send performance or inventory alerts directly to your inbox.",
  },
  {
    icon: Database,
    title: "Live MySQL Connection",
    description: "Instantly access the latest production metrics, inventory, and contamination records.",
  },
  {
    icon: Shield,
    title: "Enterprise SSO Security",
    description: "Secure access through Microsoft Entra ID (OIDC) integrated with your corporate directory.",
  },
];

const benefits = [
  "Interact with data using natural language",
  "Streamline tissue culture workflows",
  "Reduce contamination losses with smart insights",
  "Track chemical inventory & expiry effortlessly",
  "Monitor multiple lab areas in real-time",
];

export default function Landing() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { instance } = useMsal();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
      setIsLoggingIn(false);
    }
  };

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (showLoginModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showLoginModal]);

  return (
    <div className="min-h-screen relative bg-background text-foreground overflow-hidden">
      {/* Cinematic Video Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="object-cover w-full h-full opacity-90 transition-opacity duration-1000"
        >
          <source src="/landing-bg.mp4" type="video/mp4" />
        </video>
        {/* Adaptive Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background backdrop-blur-[2px] dark:from-background/30 dark:via-background/60 dark:to-background/95 dark:backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 dark:border-white/5 bg-background/30 dark:bg-background/20 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bot className="h-5 w-5 text-primary-foreground relative z-10" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">DCM LabNest</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button onClick={() => setShowLoginModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0 text-white shadow-lg shadow-emerald-500/20">Sign In / SSO</Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto text-center max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Sparkles className="h-4 w-4" />
                Meet Your AI-Powered Laboratory Assistant
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                Tissue Culture Data Management, <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                  Supercharged by AI
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
                Connected to our entire laboratory live database.
                <strong className="text-foreground font-semibold"> Get data in real-time with simple human language queries.</strong> No complex menus—just ask your AI assistant.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button onClick={() => setShowLoginModal(true)} size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-foreground text-background hover:bg-foreground/90 rounded-full group shadow-xl">
                  <Bot className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Login with Microsoft
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* AI Showcase Section */}
        <section className="py-12 px-4 relative z-20">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="border-b border-white/10 bg-muted/30 p-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  AI Query Interface
                </div>
              </div>
              <div className="p-6 sm:p-10 space-y-6 bg-gradient-to-b from-transparent to-background/50">
                {/* First exchange — DB query */}
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm sm:text-base">
                    "What is the total number of bottles produced in the Multiplication stage recently?"
                  </div>
                </div>
                <div className="flex items-start gap-4 flex-row-reverse">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Bot className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm sm:text-base">
                    <p className="mb-2">Based on the live database, there have been <strong>12,450 bottles produced</strong> in the Multiplication stage over the last 30 days.</p>
                    <p className="text-xs opacity-80">Connected to recent technician logs.</p>
                  </div>
                </div>

                {/* Second exchange — Action tool: send progress report */}
                <div className="flex items-start gap-4 pt-1">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm sm:text-base">
                    "Send the progress report and expense from 01-05-2026 to 27-05-2026 to my_manager@dcmhsriram.com"
                  </div>
                </div>
                <div className="flex items-start gap-4 flex-row-reverse">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Bot className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm sm:text-base">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wide">Background Tasks Queued</span>
                    </div>
                    <p className="mb-2">
                      ✅ The <strong>Progress Report</strong> and <strong>Expenses Report</strong> (01-05-2026 to 27-05-2026) are being generated and will be emailed to <strong>my_manager@dcmhsriram.com</strong> shortly.
                    </p>
                    <p className="text-xs opacity-70">Automated Celery worker tasks dispatched successfully.</p>
                  </div>
                </div>

                {/* Third exchange — RAG Pipeline SOP query */}
                <div className="flex items-start gap-4 pt-1">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm sm:text-base">
                    "What is the SOP for handling a sodium hypochlorite spill?"
                  </div>
                </div>
                <div className="flex items-start gap-4 flex-row-reverse">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Bot className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm sm:text-base">
                    <p className="mb-2">
                      According to the <strong>Laboratory Safety MSDS (Page 14)</strong> retrieved from Azure Blob:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 mb-2">
                      <li>Evacuate the immediate area.</li>
                      <li>Wear appropriate PPE (gloves, goggles).</li>
                      <li>Neutralize the spill with sodium thiosulfate.</li>
                      <li>Wipe from the outside in to prevent spreading.</li>
                    </ul>
                    <p className="text-xs opacity-70">Retrieved via FAISS Vector Database similarity search.</p>
                  </div>
                </div>

                {/* Fourth exchange — Chart Visualization query */}
                <div className="flex items-start gap-4 pt-1">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm sm:text-base">
                    "Plot a pie chart of contamination events by variety over the last month."
                  </div>
                </div>
                <div className="flex items-start gap-4 flex-row-reverse">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Bot className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm sm:text-base w-full max-w-[320px]">
                    <div className="h-32 w-full flex items-center justify-center bg-background/50 rounded-lg border border-border/50 mb-3">
                      <PieChart className="h-12 w-12 text-emerald-500/50" />
                      <span className="ml-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Interactive Chart Rendered</span>
                    </div>
                    <p className="mb-1 text-sm">
                      Based on the live database, <strong>Variety SC-001</strong> has the highest contamination rate (45%), followed by <strong>Variety VD-201</strong> (30%).
                    </p>
                    <p className="text-xs opacity-70">Generated using Recharts from live SQL metrics.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-4 relative z-10 bg-background/50 backdrop-blur-md border-y border-white/5">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                Smarter workflows with Intelligent Management
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our AI actively monitors your live laboratory database, ensuring nothing falls through the cracks.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={`h-full glass-card hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ${feature.highlight ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}`}>
                    <CardContent className="p-6 relative overflow-hidden">
                      {feature.highlight && (
                        <div className="absolute top-0 right-0 p-4">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        </div>
                      )}
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 ${feature.highlight ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Database className="h-4 w-4" />
                  Live Data Integration
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                  Instantly connected to your <br className="hidden sm:block" />
                  entire laboratory
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Every batch prepared, every chemical weighed, and every contamination reported is instantly analyzed by our AI to give you real-time visibility.
                </p>
                <ul className="space-y-5">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <span className="font-medium">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <Link to="/login">
                    <Button size="lg" className="h-12 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0">
                      Experience the AI
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-purple-500/20 blur-3xl rounded-full" />
                <div className="relative aspect-square rounded-3xl bg-background/40 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="text-center p-8 relative z-10">
                    <div className="relative mb-8 mx-auto w-32 h-32">
                      <div className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                      <div className="absolute inset-2 border-2 border-dashed border-purple-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Bot className="h-14 w-14 text-foreground drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">AI is Ready</h3>
                    <p className="text-muted-foreground text-sm sm:text-base px-6">
                      Your virtual assistant is waiting to help manage your workflow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-10 sm:p-16 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white flex items-center justify-center gap-3">
                  <Bot className="h-8 w-8" /> Ready to talk to your laboratory data?
                </h2>
                <p className="text-emerald-50 text-lg mb-10 max-w-2xl mx-auto">
                  Secure internal access for DCM Shriram personnel. Join now to utilize real-time AI capabilities and transform how you manage tissue culture.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/login">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-white text-emerald-700 hover:bg-gray-100 rounded-full font-semibold shadow-xl border-0">
                      Login with Microsoft SSO
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/10 py-10 px-4 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">DCM LabNest</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Help Center</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DCM Shriram Ltd. All rights reserved.
            </p>
          </div>
        </footer>
      </div>

      {/* iOS-style Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
              onClick={() => setShowLoginModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-sm pointer-events-auto">
                <div className="bg-background/80 dark:bg-background/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  {/* Close button */}
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>

                  <div className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                      <Sprout className="h-7 w-7 text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                      Welcome back
                    </h2>
                    <p className="text-sm text-muted-foreground mb-8">
                      Sign in with your organization account to access the AI dashboard.
                    </p>

                    <Button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20 bg-gradient-to-br from-[#0078d4] to-[#005a9e] hover:opacity-90 transition-opacity"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <svg className="mr-3" width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                            <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                            <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                            <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                          </svg>
                          Sign In with Microsoft
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground/60 mt-6 max-w-[250px] mx-auto">
                      Access is restricted to authorized DCM Shriram personnel.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
