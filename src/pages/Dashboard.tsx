import { useState, useMemo } from "react";
import { format, subDays, differenceInDays, formatDistanceToNow } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  FlaskConical, Bug, Beaker, Activity, TrendingUp,
  Calendar as CalendarIcon, Loader2, Send, Sprout,
  AlertTriangle, BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Treemap,
} from "recharts";
import { useDashboard, useRecentActivities, useCreateRecentActivity } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];

const STAT_CONFIG = {
  production: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800/40",
    icon: "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
    value: "text-violet-700 dark:text-violet-300",
    label: "text-violet-600/70 dark:text-violet-400/70",
    glow: "from-violet-500 to-indigo-600",
    dot: "bg-violet-400",
  },
  chemicals: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800/40",
    icon: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white",
    value: "text-teal-700 dark:text-teal-300",
    label: "text-teal-600/70 dark:text-teal-400/70",
    glow: "from-teal-500 to-cyan-600",
    dot: "bg-teal-400",
  },
  contamination: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800/40",
    icon: "bg-gradient-to-br from-rose-500 to-red-600 text-white",
    value: "text-rose-700 dark:text-rose-300",
    label: "text-rose-600/70 dark:text-rose-400/70",
    glow: "from-rose-500 to-red-600",
    dot: "bg-rose-400",
  },
  expired: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40",
    icon: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    value: "text-amber-700 dark:text-amber-300",
    label: "text-amber-600/70 dark:text-amber-400/70",
    glow: "from-amber-500 to-orange-600",
    dot: "bg-amber-400",
  },
} as const;

type StatKey = keyof typeof STAT_CONFIG;

const AVATAR_BG = [
  "bg-violet-500", "bg-indigo-500", "bg-teal-500", "bg-rose-500",
  "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-pink-500",
] as const;

const avatarColor = (name: string) =>
  AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];

// â”€â”€â”€ Static fallback data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const contaminationHeatMap = [
  { name: "Growth Room 1", size: 12 },
  { name: "Inoculation A", size: 8 },
  { name: "Greenhouse", size: 5 },
  { name: "Media Prep", size: 3 },
  { name: "Growth Room 2", size: 2 },
  { name: "Inoculation B", size: 1 },
];

const contaminationTrend = [
  { month: "Sep", cases: 3 }, { month: "Oct", cases: 5 },
  { month: "Nov", cases: 2 }, { month: "Dec", cases: 4 },
  { month: "Jan", cases: 1 }, { month: "Feb", cases: 3 },
];

const productionTrend = [
  { month: "Sep", batches: 12 }, { month: "Oct", batches: 15 },
  { month: "Nov", batches: 18 }, { month: "Dec", batches: 14 },
  { month: "Jan", batches: 20 }, { month: "Feb", batches: 16 },
];

const varietyDist = [
  { name: "SC-001", value: 35 }, { name: "SC-002", value: 25 },
  { name: "SC-003", value: 20 }, { name: "SC-004", value: 12 },
  { name: "SC-005", value: 8 },
];

const growthStageData = [
  { stage: "Inoculation", count: 120 }, { stage: "Growth Room", count: 95 },
  { stage: "Greenhouse", count: 70 }, { stage: "Hardening", count: 55 },
];

const yieldSuccessData = [
  { variety: "SC-001", successRate: 92 }, { variety: "SC-002", successRate: 85 },
  { variety: "SC-003", successRate: 78 }, { variety: "SC-004", successRate: 88 },
  { variety: "SC-005", successRate: 65 },
];

const chemicalBurnRate = [
  { week: "Week 1", agar: 50, sucrose: 30, hormones: 10 },
  { week: "Week 2", agar: 45, sucrose: 35, hormones: 12 },
  { week: "Week 3", agar: 60, sucrose: 40, hormones: 15 },
  { week: "Week 4", agar: 55, sucrose: 38, hormones: 14 },
];

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DashStatCard({
  title, value, icon, description, colorKey, alert = false, delay = 0,
}: {
  title: string; value: number; icon: React.ReactNode; description: string;
  colorKey: StatKey; alert?: boolean; delay?: number;
}) {
  const cs = STAT_CONFIG[colorKey];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={cn("relative rounded-2xl border p-5 shadow-sm overflow-hidden", cs.bg, cs.border)}
    >
      <div className={cn(
        "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl pointer-events-none",
        cs.glow,
      )} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", cs.label)}>
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold tabular-nums leading-none", cs.value)}>
              {value}
            </span>
            {alert && value > 0 && (
              <span className={cn("h-2 w-2 rounded-full animate-pulse", cs.dot)} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        </div>
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
          cs.icon,
        )}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({
  title, icon, iconBg, children, delay = 0, className,
}: {
  title: string; icon: React.ReactNode; iconBg: string;
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/40">
        <div className={cn(
          "h-7 w-7 rounded-lg flex items-center justify-center shadow-sm text-white flex-shrink-0",
          iconBg,
        )}>
          {icon}
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color ?? entry.fill }}>
          {entry.name ?? entry.dataKey}:{" "}
          <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const TreemapContent = (props: any) => {
  const { x, y, width, height, index, name } = props;
  const fill = CHART_COLORS[index % CHART_COLORS.length];
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        style={{ fill, stroke: "white", strokeWidth: 2 }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2} y={y + height / 2}
          textAnchor="middle" fill="#fff" fontSize={11} dominantBaseline="middle"
        >
          {name}
        </text>
      )}
    </g>
  );
};

export default function Dashboard() {
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const days = useMemo(() => {
    if (date?.from && date?.to) return differenceInDays(date.to, date.from) || 30;
    return 30;
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
      toast({ title: "Posted", description: "Activity updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const productionTrendData = useMemo(() => {
    if (!dashboardData?.production_trend) return productionTrend;
    return dashboardData.production_trend.map(item => ({
      month: format(new Date(item.month), "MMM"),
      batches: item.total,
    }));
  }, [dashboardData]);

  const varietyDistData = useMemo(() => {
    if (!dashboardData?.variety_distribution) return varietyDist;
    return dashboardData.variety_distribution.map(item => ({
      name: item.variety__code,
      value: item.count,
    }));
  }, [dashboardData]);

  const contaminationHeatMapData = useMemo(() => {
    if (!dashboardData?.contamination_by_area) return contaminationHeatMap;
    return dashboardData.contamination_by_area.map(item => ({
      name: item.area__name,
      size: item.count,
    }));
  }, [dashboardData]);

  return (
    <div className="p-6 space-y-6">

      {/* â”€â”€ Hero â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 px-8 py-6 shadow-xl"
      >
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl pointer-events-none" />
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.12] hidden lg:block pointer-events-none">
          <svg width="140" height="80" viewBox="0 0 140 80" fill="none">
            <polyline points="10,65 35,25 60,50 90,10 115,40 135,20"
              stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="35" cy="25" r="5" fill="white" />
            <circle cx="60" cy="50" r="5" fill="white" />
            <circle cx="90" cy="10" r="5" fill="white" />
            <circle cx="115" cy="40" r="5" fill="white" />
          </svg>
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-200">Overview</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">Dashboard</h1>
            <p className="text-sm text-violet-200 mt-0.5">Tissue Culture Lab Â· Real-time metrics</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
                  "bg-white/15 border-white/25 text-white hover:bg-white/25 hover:text-white backdrop-blur-sm",
                  !date && "text-white/60",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>{format(date.from, "LLL dd, y")} â€“ {format(date.to, "LLL dd, y")}</>
                  ) : format(date.from, "LLL dd, y")
                ) : "Pick a date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* â”€â”€ Stat cards â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-4 flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DashStatCard
              title="Total Production"
              value={dashboardData?.stats.total_production ?? 0}
              icon={<FlaskConical className="h-5 w-5" />}
              description={`Last ${days} days`}
              colorKey="production"
              delay={0.05}
            />
            <DashStatCard
              title="Total Chemicals"
              value={dashboardData?.stats.total_chemicals ?? 0}
              icon={<Beaker className="h-5 w-5" />}
              description="In inventory"
              colorKey="chemicals"
              delay={0.1}
            />
            <DashStatCard
              title="Contamination Cases"
              value={dashboardData?.stats.total_contamination ?? 0}
              icon={<Bug className="h-5 w-5" />}
              description={`Last ${days} days`}
              colorKey="contamination"
              alert
              delay={0.15}
            />
            <DashStatCard
              title="Expired Chemicals"
              value={dashboardData?.stats.expired_chemicals ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              description="Need attention"
              colorKey="expired"
              alert
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* â”€â”€ Row 1: Trend charts â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Contamination Trend"
          icon={<Bug className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-rose-500 to-red-600"
          delay={0.1}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={contaminationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Line type="monotone" dataKey="cases" name="Cases" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: "#f43f5e" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Production Trend"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-violet-500 to-indigo-600"
          delay={0.15}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="batches" name="Batches" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* â”€â”€ Row 2: Variety + Activity â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Variety Distribution"
          icon={<Sprout className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
          delay={0.2}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={varietyDistData}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                dataKey="value"
                label={({ name }) => name}
                labelLine={false}
              >
                {varietyDistData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/40">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex-shrink-0">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Recent Activity</span>
          </div>
          <div className="p-5 space-y-4">
            <form onSubmit={handlePost} className="flex gap-2">
              <Input
                placeholder="Any recent update to share?"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="flex-1 h-9 rounded-xl bg-muted/40 border-border/50"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 h-9 px-4 rounded-xl"
                disabled={createActivity.isPending}
              >
                {createActivity.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <><Send className="h-3.5 w-3.5 mr-1.5" />Post</>
                }
              </Button>
            </form>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {recentActivityData?.results?.length ? (
                recentActivityData.results.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-xl p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                      avatarColor(item.user_name ?? ""),
                    )}>
                      {(item.user_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{item.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-muted-foreground">{item.user_name}</span>
                        <span className="text-[10px] text-muted-foreground/60">Â·</span>
                        <span className="text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recent activities. Post an update!
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* â”€â”€ Advanced Analytics divider â”€â”€ */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2">
          Advanced Analytics
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* â”€â”€ Row 3: Heatmap + Growth Stage â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Contamination Heat Map"
          icon={<Bug className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-rose-500 to-red-600"
          delay={0.3}
        >
          <ResponsiveContainer width="100%" height={220}>
            <Treemap
              data={contaminationHeatMapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="transparent"
              content={<TreemapContent />}
            >
              <Tooltip content={<GlassTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Growth Stage Survival"
          icon={<Sprout className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-teal-500 to-cyan-600"
          delay={0.35}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growthStageData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={84} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="count" name="Count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* â”€â”€ Row 4: Yield + Resource â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Yield & ROI Tracking"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-emerald-500 to-green-600"
          delay={0.4}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yieldSuccessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="variety" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="successRate" name="Success Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Resource Burn Rate"
          icon={<Beaker className="h-3.5 w-3.5" />}
          iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
          delay={0.45}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chemicalBurnRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Line type="monotone" dataKey="agar" name="Agar (g)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sucrose" name="Sucrose (g)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hormones" name="Hormones (ml)" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

    </div>
  );
}
