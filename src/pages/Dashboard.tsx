import { FlaskConical, Bug, Sprout, Beaker, Activity, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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

const recentActivity = [
  { action: "Media batch MB-2026-002 prepared", user: "James Rivera", time: "2 hours ago" },
  { action: "Contamination detected in Growth Room 1", user: "Dr. Sarah Chen", time: "5 hours ago" },
  { action: "Greenhouse observation recorded", user: "Maria Santos", time: "1 day ago" },
  { action: "New chemical stock received", user: "James Rivera", time: "1 day ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-bold"
      >
        Dashboard
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Media Batches" value={42} icon={<FlaskConical className="h-5 w-5" />} description="Total active batches" />
        <StatCard title="Active Varieties" value={5} icon={<Sprout className="h-5 w-5" />} description="In cultivation" />
        <StatCard title="Contamination Cases" value={3} icon={<Bug className="h-5 w-5" />} description="Last 30 days" />
        <StatCard title="Expiring Chemicals" value={2} icon={<Beaker className="h-5 w-5" />} description="Within 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Production Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productionTrend}>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Variety Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={varietyDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {varietyDist.map((_, i) => (
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{item.action}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{item.user}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
