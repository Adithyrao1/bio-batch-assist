import { useState, useMemo } from "react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  FlaskConical, Bug, Activity, TrendingUp,
  Calendar as CalendarIcon, Loader2, Send,
  AlertTriangle, IndianRupee, PieChart as PieChartIcon,
  Sprout, BarChart2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Treemap,
  FunnelChart, Funnel, LabelList
} from "recharts";
import { useDashboard, useRecentActivities, useCreateRecentActivity } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import ChatWidget from "@/components/ChatWidget";

// Professional muted palette — 2-3 colors max, data-focused
const CHART_BLUE   = "#2563eb";
const CHART_TEAL   = "#0d9488";
const CHART_AMBER  = "#d97706";
const CHART_RED    = "#dc2626";
const CHART_SLATE  = "#64748b";
const CHART_COLORS = [CHART_BLUE, CHART_TEAL, CHART_AMBER, CHART_RED, CHART_SLATE];

// ── Stat card — flat, bordered, status-color left strip ──────────────────────
function StatCard({
  title, value, icon: Icon, description, prefix = "", suffix = "",
  variant = "default", alert = false, delay = 0,
}: {
  title: string; value: number | string; icon: React.ElementType;
  description: string; prefix?: string; suffix?: string;
  variant?: "default" | "warn" | "danger" | "success"; alert?: boolean; delay?: number;
}) {
  const strip = {
    default: "bg-blue-600",
    success: "bg-teal-600",
    warn:    "bg-amber-500",
    danger:  "bg-red-500",
  }[variant];
  const valueColor = {
    default: "text-foreground",
    success: "text-teal-700 dark:text-teal-400",
    warn:    "text-amber-700 dark:text-amber-400",
    danger:  "text-red-700 dark:text-red-400",
  }[variant];
  const iconColor = {
    default: "text-blue-600 dark:text-blue-400",
    success: "text-teal-600 dark:text-teal-400",
    warn:    "text-amber-600 dark:text-amber-400",
    danger:  "text-red-600 dark:text-red-400",
  }[variant];

  return (
    <div className="relative bg-card border border-border rounded-sm shadow-sm overflow-hidden flex">
      {/* Left accent strip */}
      <div className={cn("w-1 shrink-0", strip)} />
      <div className="flex-1 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-2xl font-bold tabular-nums leading-none", valueColor)}>
                {prefix}{value}{suffix}
              </span>
              {alert && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
          </div>
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ── Chart panel — flat card, section header ───────────────────────────────────
function ChartPanel({
  title, icon: Icon, accentColor = "text-blue-600", children, className,
}: {
  title: string; icon: React.ElementType; accentColor?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-sm shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Icon className={cn("h-4 w-4 shrink-0", accentColor)} />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// ── Clean tooltip ─────────────────────────────────────────────────────────────
const DataTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-card shadow-md rounded-sm px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1 border-b border-border pb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {entry.name ?? entry.dataKey}:{" "}
          <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Treemap cell ──────────────────────────────────────────────────────────────
const TreemapCell = (props: any) => {
  const { x, y, width, height, index, name } = props;
  const fills = [CHART_RED, CHART_AMBER, CHART_SLATE, "#b91c1c", "#92400e"];
  const fill = fills[index % fills.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: "hsl(var(--card))", strokeWidth: 2 }} />
      {width > 50 && height > 28 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={11} dominantBaseline="middle" fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
};

export default function Dashboard() {
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const days = useMemo(() => {
    if (date?.from && date?.to) return differenceInDays(date.to, date.from) || 0;
    return 0;
  }, [date]);

  const { data: dashboardData, isLoading } = useDashboard(days);
  const { data: recentActivityData } = useRecentActivities();
  const createActivity = useCreateRecentActivity();
  const [newActivity, setNewActivity] = useState("");

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;
    try {
      await createActivity.mutateAsync({ content: newActivity.trim() });
      setNewActivity("");
      toast({ title: "Posted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { stats, production_pipeline, production_trend, contamination_by_stage, contamination_trend, variety_distribution, success_rate_per_variety } = dashboardData;

  const pipelineData = production_pipeline.map((p) => ({
    name: p.stage,
    value: p.count,
    fill: CHART_COLORS[["Initiation","Multiplication","Rooting","Hardening","Transplantation"].indexOf(p.stage) % CHART_COLORS.length],
  }));

  return (
    <>
      <div className="space-y-5">

        {/* ── Page header bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ChevronRight className="h-3 w-3" />
              <span>Production Unit</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">Dashboard</span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Production Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time throughput and efficiency metrics</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal text-xs",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {date?.from ? (
                  date.to ? (
                    <>{format(date.from, "dd MMM yy")} – {format(date.to, "dd MMM yy")}</>
                  ) : format(date.from, "dd MMM yy")
                ) : "All Time"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Net Production"
            value={stats.total_production.toLocaleString()}
            icon={FlaskConical}
            description="Transplanted successfully"
            variant="default"
            delay={0.05}
          />
          <StatCard
            title="Cost Per Plantlet"
            value={stats.cost_per_plantlet}
            prefix="₹"
            icon={IndianRupee}
            description="Overhead + chemicals"
            variant="success"
            delay={0.1}
          />
          <StatCard
            title="Pipeline Survival"
            value={stats.overall_success_rate}
            suffix="%"
            icon={TrendingUp}
            description="Overall pipeline success rate"
            variant={stats.overall_success_rate < 70 ? "warn" : "success"}
            delay={0.15}
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.low_stock_chemicals}
            icon={AlertTriangle}
            description="Chemicals ≤ 30% capacity"
            variant={stats.low_stock_chemicals > 0 ? "danger" : "default"}
            alert={stats.low_stock_chemicals > 0}
            delay={0.2}
          />
        </div>

        {/* ── Row 1: Production analytics + Activity feed ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartPanel title="Production Analytics" icon={BarChart2} accentColor="text-blue-600" className="lg:col-span-2 h-[400px]">
            <Tabs defaultValue="pipeline" className="w-full h-full flex flex-col">
              <div className="flex justify-end mb-3">
                <TabsList className="h-7 text-xs">
                  <TabsTrigger value="pipeline" className="text-xs px-3">Pipeline</TabsTrigger>
                  <TabsTrigger value="trend" className="text-xs px-3">Trend</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="pipeline" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={280}>
                  <FunnelChart>
                    <Tooltip content={<DataTooltip />} />
                    <Funnel dataKey="value" data={pipelineData} isAnimationActive>
                      <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="trend" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={production_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DataTooltip />} />
                    <Bar dataKey="total" name="Plantlets" fill={CHART_BLUE} radius={[2, 2, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </ChartPanel>

          {/* Activity feed */}
          <div className="bg-card border border-border rounded-sm shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold">Lab Activity Feed</span>
            </div>
            <div className="px-3 py-3 border-b border-border">
              <form onSubmit={handlePost} className="flex gap-2">
                <Input
                  placeholder="Post an update..."
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-sm"
                />
                <Button type="submit" size="sm" className="h-8 px-3 rounded-sm shrink-0" disabled={createActivity.isPending}>
                  {createActivity.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {recentActivityData?.results?.length ? (
                recentActivityData.results.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="h-7 w-7 rounded-sm bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {(item.user_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{item.content}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-medium text-muted-foreground">{item.user_name}</span>
                        <span className="text-[10px] text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No activity posted yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Contamination + Variety ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartPanel title="Contamination Tracking" icon={Bug} accentColor="text-red-600" className="lg:col-span-2 h-[340px]">
            <Tabs defaultValue="stage" className="w-full h-full flex flex-col">
              <div className="flex justify-end mb-3">
                <TabsList className="h-7">
                  <TabsTrigger value="stage" className="text-xs px-3">By Stage</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs px-3">Timeline</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="stage" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={230}>
                  <Treemap data={contamination_by_stage} dataKey="size" aspectRatio={4 / 2.5} stroke="transparent" content={<TreemapCell />}>
                    <Tooltip content={<DataTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="timeline" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={contamination_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DataTooltip />} />
                    <Line type="monotone" dataKey="cases" name="Cases" stroke={CHART_RED} strokeWidth={2} dot={{ r: 3, fill: CHART_RED }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </ChartPanel>

          <ChartPanel title="Variety Analysis" icon={PieChartIcon} accentColor="text-teal-600" className="h-[340px]">
            <Tabs defaultValue="output" className="w-full h-full flex flex-col">
              <div className="flex justify-end mb-3">
                <TabsList className="h-7">
                  <TabsTrigger value="output" className="text-xs px-3">Output</TabsTrigger>
                  <TabsTrigger value="survival" className="text-xs px-3">Survival</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="output" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={variety_distribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name }) => name} labelLine={false}>
                      {variety_distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<DataTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="survival" className="mt-0 outline-none flex-1">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={success_rate_per_variety} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <YAxis dataKey="variety" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip content={<DataTooltip />} />
                    <Bar dataKey="successRate" name="Success %" fill={CHART_TEAL} radius={[0, 2, 2, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </ChartPanel>
        </div>

      </div>

      <ChatWidget />
    </>
  );
}
