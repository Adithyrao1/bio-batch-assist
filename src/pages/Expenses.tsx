import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, FileText, TrendingDown, Calendar as CalendarIcon, DollarSign, Sprout, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExpenses, useChemicals, useDashboard, useManpowerExpenses } from "@/hooks/useApiQueries";
import { ChemicalPricingTable } from "@/components/expenses/ChemicalPricingTable";
import { ExpenseLogTable } from "@/components/expenses/ExpenseLogTable";
import { UserAvatar } from "@/components/UserAvatar";

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("dashboard");
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const days = useMemo(() => {
    if (date?.from && date?.to) return differenceInDays(date.to, date.from) || 0;
    return 0; // 0 means all-time in backend
  }, [date]);

  const { data: dashboardData } = useDashboard(days);
  const { data: expenses } = useExpenses();
  const { data: chemicals } = useChemicals();
  const { data: manpowerData } = useManpowerExpenses();
  
  // Pull real aggregated data from the dashboard endpoint
  const stats = dashboardData?.stats;
  const totalCost = stats?.total_cost || 0;
  const totalPlantlets = stats?.total_production || 0;
  const costPerPlantlet = stats?.cost_per_plantlet || 0;

  const tabs = [
    { id: "dashboard", label: "Cost Dashboard", icon: TrendingDown },
    { id: "chemicals", label: "Chemical Pricing", icon: Beaker },
    { id: "logs",      label: "Other Expenses",  icon: FileText },
    ...(isAdmin ? [{ id: "manpower", label: "Manpower", icon: Users }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Expenses & Costing
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track direct and indirect costs to calculate cost per plantlet.
          </p>
        </div>
        
        {activeTab === "dashboard" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal bg-card h-9 border-border/60 text-xs",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                {date?.from ? (
                  date.to ? (
                    <>{format(date.from, "LLL dd, y")} – {format(date.to, "LLL dd, y")}</>
                  ) : format(date.from, "LLL dd, y")
                ) : "All Time (Project Start)"}
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
        )}
      </div>

      {/* Flat Industrial Tabs Control */}
      <div className="flex items-center border-b border-border/60 bg-transparent p-0 h-10 space-x-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all relative ${
                isActive 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "dashboard" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="relative overflow-hidden border-l-4 border-l-blue-600 bg-card rounded-md shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Operational Cost (30 Days)</span>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold tracking-tight text-foreground">₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Chemical consumption + overhead logs</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-l-4 border-l-sky-500 bg-card rounded-md shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Plantlets Produced</span>
                    <Sprout className="h-4 w-4 text-sky-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold tracking-tight text-foreground">{totalPlantlets.toLocaleString()}</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Transplanted output (30 Days)</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 bg-card rounded-md shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Est. Cost Per Plantlet</span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-500">₹{costPerPlantlet.toFixed(3)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Total Cost / {totalPlantlets.toLocaleString()} Plantlets</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "chemicals" && (
            <Card className="rounded-md border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Chemical Pricing</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Update unit prices for accurate automated cost calculation.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ChemicalPricingTable isAdmin={isAdmin} />
              </CardContent>
            </Card>
          )}

          {activeTab === "logs" && (
            <Card className="rounded-md border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Expense Logs & Categories</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Manually log bills, invoices, and overhead expenses.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ExpenseLogTable isAdmin={isAdmin} />
              </CardContent>
            </Card>
          )}

          {activeTab === "manpower" && isAdmin && (
            <Card className="rounded-md border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Manpower Expenses</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Monthly salaries for all technicians. Included in cost-per-plantlet via daily rate.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Monthly Payroll</p>
                    <p className="text-lg font-black text-emerald-500">
                      ₹{Number(manpowerData?.total_monthly_payroll ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Technician</th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Salary</th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Rate</th>
                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(manpowerData?.results ?? []).map((r) => (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={r.technician_name} size="sm" />
                              <span className="text-xs font-medium text-foreground">{r.technician_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-bold text-emerald-500">
                              ₹{Number(r.monthly_salary).toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-muted-foreground font-mono">
                              ₹{Number(r.daily_rate).toFixed(2)}/day
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes || "—"}</td>
                        </tr>
                      ))}
                      {(manpowerData?.results ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground/50">
                            No salary records set. Go to Manpower page to add them.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
