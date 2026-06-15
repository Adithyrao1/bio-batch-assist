import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, Send, Loader2, ChevronLeft,
  Sparkles, CornerDownLeft, User, RefreshCw,
  Mic, MicOff, Volume2, VolumeX, ChevronDown,
  Mail, PieChart, Database, Users
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import ChartRenderer from "../components/ChartRenderer";
import { useVoice } from "@/hooks/useVoice";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const STARTER_GROUPS = [
  {
    id: "reports",
    title: "Reports & Emails",
    icon: Mail,
    prompts: [
      "Send the progress report from 01-05-2026 to 27-05-2026 to my_manager@dcmhsriram.com",
      "Send the expenses report from 01-05-2026 to 27-05-2026 to my_manager@dcmhsriram.com",
      "Send me the weekly lab performance report as a PDF",
    ]
  },
  {
    id: "charts",
    title: "Charts & Visualizations",
    icon: PieChart,
    prompts: [
      "Show me a pie chart of contamination events by variety",
      "Give me a summary of our expenses over the last 30 days",
    ]
  },
  {
    id: "queries",
    title: "Lab Queries & SOPs",
    icon: Database,
    prompts: [
      "What is the SOP for handling a sodium hypochlorite spill?",
      "Which crop variety has the highest mortality rate?",
      "Pichle mahine me konsi variety me sabse zyada production hua?",
    ]
  },
  {
    id: "manpower",
    title: "Expenses, Costing & Payroll",
    icon: Users,
    prompts: [
      "What is our current cost per plantlet?",
      "Give me a breakdown of our total operational cost — chemicals, manpower, and other expenses",
      "How much did we spend on manpower from 2026-01-01 to 2026-06-15?",
      "Show me the total monthly payroll for all technicians",
      "What is the salary of Ravi?",
      "Which chemicals contributed the most to our costs this month?",
    ]
  },
];

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 shadow-sm">
        <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-violet-400"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Single message bubble ───────────────────────────────────────────────────
function MessageBubble({ msg, userName }: { msg: Message; userName: string }) {
  const isUser = msg.role === "user";

  let contentStr = msg.content;
  let chartData: { type: string; title: string; json: string } | null = null;
  let textBeforeChart = "";
  let textAfterChart = "";

  if (!isUser && contentStr.includes("===CHART_BEGIN===") && contentStr.includes("===CHART_END===")) {
    const beginIdx = contentStr.indexOf("===CHART_BEGIN===");
    const endIdx = contentStr.indexOf("===CHART_END===") + "===CHART_END===".length;
    
    textBeforeChart = contentStr.substring(0, beginIdx).trim();
    textAfterChart = contentStr.substring(endIdx).trim();
    
    const chartPayload = contentStr.substring(beginIdx + "===CHART_BEGIN===".length, contentStr.indexOf("===CHART_END===")).trim();
    const parts = chartPayload.split("|");
    if (parts.length >= 3) {
      chartData = {
        type: parts[0],
        title: parts[1],
        json: parts.slice(2).join("|")
      };
    }
  }

  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          return isBlock ? (
            <pre className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono border border-border/40">
              <code>{children}</code>
            </pre>
          ) : (
            <code className="bg-muted text-violet-600 dark:text-violet-400 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/50 border-b border-border text-muted-foreground">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-4 py-3">{children}</td>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="my-2 border-border/40" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
          <User className="h-4 w-4 text-white" />
        </div>
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 shadow-sm">
          <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm"
            : "bg-card border border-border/60 text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          msg.content
        ) : chartData ? (
          <div className="flex flex-col gap-2 w-full min-w-[300px]">
            {textBeforeChart && <MarkdownContent content={textBeforeChart} />}
            <ChartRenderer chartType={chartData.type} title={chartData.title} dataJson={chartData.json} />
            {textAfterChart && <MarkdownContent content={textAfterChart} />}
          </div>
        ) : (
          <MarkdownContent content={msg.content} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const INITIAL_MESSAGE: Message = {
    id: 0,
    role: "assistant",
    content: "Hi! I'm LabNest AI 🔬\n\nI have access to your entire lab database. Ask me anything — contamination trends, chemical inventory, batch stats, variety performance, and more.",
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [openGroup, setOpenGroup] = useState<string | null>("reports");

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    msgIdRef.current = 1;
  };
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const msgIdRef = useRef(1);
  const sendMessageRef = useRef<((text?: string) => void) | null>(null);

  const { isListening, startListening, stopListening, speak, stopSpeaking, isSpeaking } = useVoice(
    setInput,
    (text) => {
      if (sendMessageRef.current) {
        sendMessageRef.current(text);
      }
    }
  );

  useEffect(() => {
    if (!readAloud) {
      stopSpeaking();
    }
  }, [readAloud, stopSpeaking]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    const userMsg: Message = { id: msgIdRef.current++, role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetchWithAuth("/ai-assistant/", {
        method: "POST",
        body: JSON.stringify({ message: messageText }),
      });
      const data = await res.json();

      const reply = res.ok ? (data.reply ?? "No response.") : (data.error ?? "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        { id: msgIdRef.current++, role: "assistant", content: reply },
      ]);
      
      if (readAloud) {
        speak(reply);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: msgIdRef.current++, role: "assistant", content: "Network error. Please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, readAloud, speak]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showStarters = messages.length === 1 && !loading;

  const userName = user ? `${user.name}` : "You";

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] relative overflow-hidden bg-background">

      {/* Background Glassmorphism Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] bg-violet-500/10 dark:bg-violet-600/15"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] bg-indigo-500/10 dark:bg-indigo-600/15"
        />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 50, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full blur-[90px] bg-cyan-400/10 dark:bg-cyan-500/10"
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, -40, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 7 }}
          className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full blur-[110px] bg-fuchsia-400/10 dark:bg-fuchsia-500/10"
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 overflow-hidden border-b border-border/50 bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 px-6 py-4 flex-shrink-0"
      >
        {/* Decorative orbs */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 left-16 h-24 w-24 rounded-full bg-indigo-300/10 blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <img src="/chatbot.png" alt="LabNest AI" className="h-6 w-6 object-contain drop-shadow-md" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">LabNest AI</p>
              <p className="text-[11px] text-white/65 mt-0.5">Ask anything about your lab data</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setReadAloud(!readAloud)}
              title={readAloud ? "Read Aloud: ON" : "Read Aloud: OFF"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
                readAloud ? "bg-emerald-500/20 text-emerald-100" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              )}
            >
              {readAloud ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="text-[11px] font-medium hidden sm:inline">Voice</span>
            </button>
            <button
              onClick={handleResetChat}
              title="New Chat"
              className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-medium text-white hidden sm:inline">New Chat</span>
            </button>
            <div className="flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-violet-100 hidden sm:inline tracking-wide">DeepSeek</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((msg, idx) => 
              (showStarters && idx === 0) ? null : (
                <MessageBubble key={msg.id} msg={msg} userName={userName} />
              )
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {loading && <TypingIndicator />}
          </AnimatePresence>

          {/* Suggested starter questions */}
          <AnimatePresence>
            {showStarters && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="pt-2"
              >
                {/* Animated Empty State Avatar */}
                <div className="flex flex-col items-center justify-center pt-8 pb-10">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex items-center justify-center h-24 w-24 mb-4"
                  >
                    <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
                    <div className="absolute inset-2 bg-indigo-400/30 blur-md rounded-full" />
                    <motion.div 
                      className="relative h-20 w-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[2rem] shadow-xl flex items-center justify-center border-4 border-background"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Bot className="h-10 w-10 text-white" />
                      {/* Waving hand */}
                      <motion.div
                        animate={{ rotate: [0, 20, -10, 20, 0] }}
                        transition={{ duration: 1.5, repeatDelay: 3, repeat: Infinity }}
                        className="absolute -right-3 -top-3 text-2xl"
                        style={{ originX: 0.8, originY: 0.8 }}
                      >
                        👋
                      </motion.div>
                    </motion.div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-center space-y-1"
                  >
                    <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                      Hi, {userName.split(" ")[0]}!
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-[280px]">
                      I'm ready to analyze your lab data. What would you like to know?
                    </p>
                  </motion.div>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">
                  Try asking…
                </p>
                <div className="flex flex-col gap-3">
                  {STARTER_GROUPS.map((group) => {
                    const isOpen = openGroup === group.id;
                    const Icon = group.icon;
                    return (
                      <div key={group.id} className="rounded-xl border border-border/60 bg-card/40 overflow-hidden transition-all duration-200">
                        <button
                          onClick={() => setOpenGroup(isOpen ? null : group.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-card/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-sm text-foreground/90">{group.title}</span>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-2 pt-0 grid grid-cols-1 gap-1 border-t border-border/40 bg-card/20">
                                {group.prompts.map((q, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => sendMessage(q)}
                                    className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground/80 hover:text-foreground hover:bg-violet-500/5 transition-all group"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-violet-400 group-hover:text-violet-500 transition-colors" />
                                    <span className="leading-snug">{q}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            "flex items-end gap-3 rounded-2xl border bg-card px-4 py-3 transition-all duration-300 relative overflow-hidden group",
            loading ? "border-border/40" : "border-border/60 focus-within:border-violet-500/80 focus-within:shadow-[0_0_20px_rgba(124,58,237,0.15)] focus-within:bg-card/90"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask a question about your lab data…"}
              disabled={loading || isListening}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 leading-relaxed"
              style={{ minHeight: "24px", maxHeight: "120px" }}
            />

            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  isListening 
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse" 
                    : "bg-muted text-muted-foreground hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/40 dark:hover:text-violet-400"
                )}
                title={isListening ? "Stop listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </motion.button>
              <span className="text-[10px] text-muted-foreground/50 hidden sm:block">
                <CornerDownLeft className="h-3 w-3 inline -mt-0.5 mr-0.5" />Enter
              </span>
              <motion.button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl text-white transition-all",
                  input.trim() && !loading
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:shadow-md hover:shadow-violet-500/30"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </motion.button>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
            Answers are AI-generated from your database. Always verify critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
