import { useState, useMemo } from "react";
import { format, subDays, differenceInDays, formatDistanceToNow } from "date-fns";
import { DateRange } from "react-day-picker";
import { FlaskConical, Bug, Sprout, Beaker, Activity, TrendingUp, Calendar as CalendarIcon, Loader2, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Treemap } from "recharts";
import { useDashboard, useRecentActivities, useCreateRecentActivity } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Minimal Treemap Content to display names
const CustomizedContent = (props: any) => {
  const { x, y, width, height, index, name } = props;
  const colors = props.colors || ['#8884d8'];
  const fill = colors[index % colors.length];

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
      {width > 50 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} dominantBaseline="middle">
          {name}
        </text>
      )}
    </g>
  );
};

// Minimal Custom Tooltip for Treemap
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card text-card-foreground p-2 rounded-md shadow-sm">
        <p className="font-semibold">{`${payload[0].payload.name}`}</p>
        <p className="text-sm">{`Cases: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const contaminationHeatMap = [
  { name: 'Growth Room 1', size: 12, color: 'hsl(0, 84.2%, 60.2%)' },
  { name: 'Inoculation A', size: 8, color: 'hsl(38, 92%, 50%)' },
  { name: 'Greenhouse', size: 5, color: 'hsl(145, 60%, 40%)' },
  { name: 'Media Prep', size: 3, color: 'hsl(210, 45%, 55%)' },
  { name: 'Growth Room 2', size: 2, color: 'hsl(210, 45%, 55%)' },
  { name: 'Inoculation B', size: 1, color: 'hsl(210, 45%, 55%)' },
];

const contaminationTrend = [
  { month: "Sep", cases: 3 },
  { month: "Oct", cases: 5 },
  { month: "Nov", cases: 2 },
  { month: "Dec", cases: 4 },
  { month: "Jan", cases: 1 },
  { month: "Feb", cases: 3 },
];

const productionTrend = [
  { month: "Sep", batches: 12 },
  { month: "Oct", batches: 15 },
  { month: "Nov", batches: 18 },
  { month: "Dec", batches: 14 },
  { month: "Jan", batches: 20 },
  { month: "Feb", batches: 16 },
];

const varietyDist = [
  { name: "SC-001", value: 35 },
  { name: "SC-002", value: 25 },
  { name: "SC-003", value: 20 },
  { name: "SC-004", value: 12 },
  { name: "SC-005", value: 8 },
];

const CHART_COLORS = [
  "hsl(168, 55%, 38%)",
  "hsl(210, 45%, 55%)",
  "hsl(145, 60%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

const growthStageData = [
  { stage: "Inoculation", count: 120 },
  { stage: "Growth Room", count: 95 },
  { stage: "Greenhouse", count: 70 },
  { stage: "Hardening", count: 55 },
];

const yieldSuccessData = [
  { variety: "SC-001", successRate: 92 },
  { variety: "SC-002", successRate: 85 },
  { variety: "SC-003", successRate: 78 },
  { variety: "SC-004", successRate: 88 },
  { variety: "SC-005", successRate: 65 },
];

const chemicalBurnRate = [
  { week: "Week 1", agar: 50, sucrose: 30, hormones: 10 },
  { week: "Week 2", agar: 45, sucrose: 35, hormones: 12 },
  { week: "Week 3", agar: 60, sucrose: 40, hormones: 15 },
  { week: "Week 4", agar: 55, sucrose: 38, hormones: 14 },
];

export default function Dashboard() {
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Calculate days from date range
  const days = useMemo(() => {
    if (date?.from && date?.to) {
      return differenceInDays(date.to, date.from) || 30;
    }
    return 30;
  }, [date]);

  const { data: dashboardData, isLoading } = useDashboard(days);
  const { data: recentActivityData } = useRecentActivities();
  const createActivity = useCreateRecentActivity();
  const [newActivity, setNewActivity] = useState("");

  const handleCreateActivity = async (e: React.FormEvent) => {
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

  // Transform API data for charts
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
    return dashboardData.contamination_by_area.map((item, i) => ({
      name: item.area__name,
      size: item.count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [dashboardData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold"
        >
          Dashboard
        </motion.h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal glass-card",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
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
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <StatCard
              title="Total Production"
              value={dashboardData?.stats.total_production ?? 0}
              icon={<FlaskConical className="h-5 w-5" />}
              description={`Last ${days} days`}
            />
            <StatCard
              title="Total Chemicals"
              value={dashboardData?.stats.total_chemicals ?? 0}
              icon={<Beaker className="h-5 w-5" />}
              description="In inventory"
            />
            <StatCard
              title="Contamination Cases"
              value={dashboardData?.stats.total_contamination ?? 0}
              icon={<Bug className="h-5 w-5" />}
              description={`Last ${days} days`}
            />
            <StatCard
              title="Expired Chemicals"
              value={dashboardData?.stats.expired_chemicals ?? 0}
              icon={<Beaker className="h-5 w-5" />}
              description="Need attention"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" /> Contamination Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={contaminationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cases" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Production Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="batches" fill="hsl(168, 55%, 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Variety Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={varietyDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {varietyDistData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateActivity} className="flex gap-2 mb-4">
                <Input 
                  placeholder="Hey! ? any recent update from your side? ."
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={createActivity.isPending}>
                  {createActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Post
                </Button>
              </form>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivityData?.results?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.content}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs truncate max-w-[100px]">{item.user_name}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!recentActivityData?.results || recentActivityData.results.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No recent activities. Post an update!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* New Placeholder Analytics */}
      <h2 className="text-xl font-semibold mt-8 mb-4">Advanced Analytics (Preview)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" /> Contamination Heat Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <Treemap
                  data={contaminationHeatMap}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<CustomizedContent colors={CHART_COLORS} />}
                >
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" /> Growth Stage Survival
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={growthStageData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(160, 15%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="h-full glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Yield & ROI Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yieldSuccessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis dataKey="variety" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="successRate" fill="hsl(145, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Beaker className="h-4 w-4 text-warning" /> Resource Burn Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chemicalBurnRate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="agar" stroke="hsl(221, 83%, 53%)" strokeWidth={2} name="Agar (g)" />
                  <Line type="monotone" dataKey="sucrose" stroke="hsl(210, 45%, 55%)" strokeWidth={2} name="Sucrose (g)" />
                  <Line type="monotone" dataKey="hormones" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Hormones (ml)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
