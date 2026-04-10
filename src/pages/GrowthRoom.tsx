import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGrowthRoom, useCreateGrowthRoom, useUpdateGrowthRoom, useDeleteGrowthRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import GrowthRoomDialog from "@/components/GrowthRoomDialog";
import type { GrowthRoom, GrowthRoomCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sprout, Thermometer, TestTubeDiagonal, ShieldAlert, ShieldCheck,
  Search, Plus, Download, Loader2, AlertTriangle, RefreshCw,
  Pencil, Trash2, CalendarDays, TrendingDown, TrendingUp, Minus,
} from "lucide-react";

// ─── Variety color palette (deterministic by index) ────────────────────────
const VARIETY_PALETTE = [
  "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800/50",
  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800/50",
  "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
];

// ─── Dual-value cell (bottles | cultures) ─────────────────────────────────
function DualCell({
  bottles, cultures, bottleColor = "text-foreground", cultureColor = "text-muted-foreground",
}: { bottles: number; cultures: number; bottleColor?: string; cultureColor?: string }) {
  return (
    <div className="flex items-center gap-1.5 tabular-nums text-sm">
      <span className={`font-semibold ${bottleColor}`}>{bottles}</span>
      <span className="text-muted-foreground/40 text-xs">|</span>
      <span className={`${cultureColor}`}>{cultures}</span>
    </div>
  );
}

// ─── Closing trend vs opening ──────────────────────────────────────────────
function ClosingTrend({ opening, closing }: { opening: number; closing: number }) {
  const diff = closing - opening;
  if (diff > 0) return (
    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="h-3 w-3 flex-shrink-0" />
      <span className="font-semibold tabular-nums">{closing}</span>
      <span className="text-xs opacity-60">+{diff}</span>
    </div>
  );
  if (diff < 0) return (
    <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400">
      <TrendingDown className="h-3 w-3 flex-shrink-0" />
      <span className="font-semibold tabular-nums">{closing}</span>
      <span className="text-xs opacity-60">{diff}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-3 w-3 flex-shrink-0" />
      <span className="font-semibold tabular-nums">{closing}</span>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, colorClass, delay = 0,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  colorClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow duration-300 group"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${colorClass} blur-2xl scale-150`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${colorClass} shadow-inner`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function GrowthRoom() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useGrowthRoom();
  const createRecord = useCreateGrowthRoom();
  const updateRecord = useUpdateGrowthRoom();
  const deleteRecord = useDeleteGrowthRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<GrowthRoom | null>(null);
  const [search, setSearch] = useState("");

  const allRecords = data?.results ?? [];

  // ─── Variety color map ─────────────────────────────────────────────────
  const varietyColorMap = useMemo(() => {
    const types = Array.from(new Set(allRecords.map((r) => r.variety_code).filter(Boolean))) as string[];
    return Object.fromEntries(types.map((t, i) => [t, VARIETY_PALETTE[i % VARIETY_PALETTE.length]]));
  }, [allRecords]);

  // ─── Filter configs ────────────────────────────────────────────────────
  const varietyOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.variety_code).filter(Boolean))) as string[],
    [allRecords]
  );

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "variety", label: "Variety", type: "select", color: "emerald", options: varietyOptions.map((v) => ({ value: v, label: v })), placeholder: "All varieties" },
    { key: "dateFrom", label: "LTD Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "LTD Date To", type: "date", color: "orange" },
    { key: "contaminated", label: "Contaminated", type: "select", color: "rose", options: [{ value: "yes", label: "Has contamination" }, { value: "no", label: "No contamination" }], placeholder: "All" },
  ], [varietyOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // ─── Filtered + searched data ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    const { variety, dateFrom, dateTo, contaminated } = filterValues;
    const varieties = variety ? variety.split(",") : [];
    const contaminatedVals = contaminated ? contaminated.split(",") : [];
    return allRecords.filter((r) => {
      if (varieties.length > 0 && !varieties.includes(r.variety_code)) return false;
      if (dateFrom && r.ltd_date < dateFrom) return false;
      if (dateTo && r.ltd_date > dateTo) return false;
      if (contaminatedVals.includes("yes") && !contaminatedVals.includes("no") && r.contaminated_bottles === 0) return false;
      if (contaminatedVals.includes("no") && !contaminatedVals.includes("yes") && r.contaminated_bottles > 0) return false;
      return true;
    });
  }, [allRecords, filterValues]);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const q = search.toLowerCase();
    return filteredData.filter((r) =>
      [r.variety_code, r.ltd_date, r.planning, r.recorded_by_name]
        .some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [filteredData, search]);

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalBottles = allRecords.reduce((s, r) => s + (r.opening_bottles ?? 0), 0);
    const totalCultures = allRecords.reduce((s, r) => s + (r.opening_cultures ?? 0), 0);
    const totalContaminated = allRecords.reduce((s, r) => s + (r.contaminated_bottles ?? 0), 0);
    const contamRate = totalBottles > 0 ? ((totalContaminated / totalBottles) * 100).toFixed(1) : "0.0";
    return { totalBottles, totalCultures, totalContaminated, contamRate };
  }, [allRecords]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleFilterChange = (key: string, value: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilterValues({});

  const handleDelete = (item: GrowthRoom) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: GrowthRoomCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Growth room record added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Record updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save record", variant: "destructive" });
      throw err;
    }
  };

  // ─── Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["LTD Date", "Variety", "Open Bottles", "Open Cultures", "Issued B", "Issued C", "Received B", "Received C", "Contaminated B", "Contaminated C", "Close Bottles", "Close Cultures"];
    const rows = displayData.map((r) => [
      r.ltd_date, r.variety_code ?? "", r.opening_bottles, r.opening_cultures,
      r.issued_bottles, r.issued_cultures, r.received_bottles, r.received_cultures,
      r.contaminated_bottles, r.contaminated_cultures, r.closing_bottles, r.closing_cultures,
    ].map((v) => `"${v}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "growth-room.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-emerald-600 to-lime-500 dark:from-green-900 dark:via-emerald-800 dark:to-lime-800 p-6 shadow-lg shadow-green-500/20">
        {/* Leaf-vein decoration */}
        <svg className="absolute right-0 top-0 h-full w-64 opacity-10 pointer-events-none" viewBox="0 0 256 200" fill="none">
          <path d="M256 0 C180 40 120 80 80 200" stroke="white" strokeWidth="1.5" />
          <path d="M256 40 C200 70 150 110 120 200" stroke="white" strokeWidth="1" />
          <path d="M256 80 C220 100 180 140 160 200" stroke="white" strokeWidth="0.75" />
          <path d="M160 0 C140 50 100 90 60 200" stroke="white" strokeWidth="1" />
        </svg>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex-shrink-0">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Growth Room</h1>
              <p className="text-sm text-white/70 mt-0.5">Bottle & culture tracking · contamination monitoring · yield trends</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              onClick={exportCSV}
              className="h-9 bg-white/15 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all gap-1.5"
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            {hasPermission("create") && (
              <Button
                onClick={() => { setDialogMode("create"); setSelectedItem(null); setIsDialogOpen(true); }}
                className="h-9 bg-white text-green-700 hover:bg-white/90 font-semibold shadow-lg shadow-black/10 transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Sprout}        label="Total Records"     value={allRecords.length}      sub={`${displayData.length} showing`}       colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" delay={0.05} />
        <StatCard icon={TestTubeDiagonal} label="Opening Bottles" value={stats.totalBottles}   sub="across all entries"                    colorClass="bg-lime-500/10 text-lime-600 dark:text-lime-400"          delay={0.1} />
        <StatCard icon={Thermometer}   label="Opening Cultures"  value={stats.totalCultures}    sub="culture units tracked"                 colorClass="bg-green-500/10 text-green-600 dark:text-green-400"       delay={0.15} />
        <StatCard icon={ShieldAlert}   label="Contaminated"      value={stats.totalContaminated} sub={`${stats.contamRate}% rate`}          colorClass={stats.totalContaminated > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-slate-500/10 text-slate-500 dark:text-slate-400"} delay={0.2} />
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={clearFilters}
        totalCount={allRecords.length}
        filteredCount={filteredData.length}
      />

      {/* ── Table card ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search variety, date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-background/60 border-border/60"
            />
          </div>
          <div className="flex items-center gap-3">
            {stats.totalContaminated > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                {stats.totalContaminated} contaminated
              </span>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{displayData.length}</span> record{displayData.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading growth room data…</p>
          </div>

        /* Error */
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-semibold text-foreground">Failed to load data</p>
            <p className="text-sm text-muted-foreground max-w-xs">Could not reach the server. Check your connection.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5 mt-1">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>

        /* Empty */
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Sprout className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground">No records found</p>
            <p className="text-sm text-muted-foreground">Try adjusting filters or add a new entry.</p>
          </div>

        /* Table */
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />LTD Date</div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Variety</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <div className="flex flex-col leading-tight">
                      <span>Opening</span>
                      <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal">btl | cult</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <div className="flex flex-col leading-tight">
                      <span>Issued</span>
                      <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal">btl | cult</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <div className="flex flex-col leading-tight">
                      <span>Received</span>
                      <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal">btl | cult</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Contaminated</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <div className="flex flex-col leading-tight">
                      <span>Closing</span>
                      <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal">vs opening</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {displayData.map((record, i) => {
                    const varColor = varietyColorMap[record.variety_code ?? ""] ?? VARIETY_PALETTE[0];
                    const isContaminated = (record.contaminated_bottles ?? 0) > 0;
                    return (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                        className={`group border-b border-border/40 transition-colors duration-150
                          ${isContaminated
                            ? "hover:bg-rose-50/30 dark:hover:bg-rose-900/10"
                            : "hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"
                          }`}
                      >
                        {/* LTD Date */}
                        <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                          {record.ltd_date}
                        </TableCell>

                        {/* Variety */}
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${varColor}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
                            {record.variety_code ?? "—"}
                          </span>
                        </TableCell>

                        {/* Opening */}
                        <TableCell className="py-3">
                          <DualCell
                            bottles={record.opening_bottles ?? 0}
                            cultures={record.opening_cultures ?? 0}
                            bottleColor="text-foreground"
                          />
                        </TableCell>

                        {/* Issued */}
                        <TableCell className="py-3">
                          <DualCell
                            bottles={record.issued_bottles ?? 0}
                            cultures={record.issued_cultures ?? 0}
                            bottleColor="text-amber-600 dark:text-amber-400"
                            cultureColor="text-amber-500/70 dark:text-amber-500/70"
                          />
                        </TableCell>

                        {/* Received */}
                        <TableCell className="py-3">
                          <DualCell
                            bottles={record.received_bottles ?? 0}
                            cultures={record.received_cultures ?? 0}
                            bottleColor="text-sky-600 dark:text-sky-400"
                            cultureColor="text-sky-500/70 dark:text-sky-500/70"
                          />
                        </TableCell>

                        {/* Contaminated */}
                        <TableCell className="py-3">
                          {isContaminated ? (
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                              </span>
                              <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {record.contaminated_bottles}
                                {(record.contaminated_cultures ?? 0) > 0 && (
                                  <span className="text-xs font-normal text-rose-400 ml-1">/ {record.contaminated_cultures}c</span>
                                )}
                              </span>
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs font-medium">Clean</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Closing with trend */}
                        <TableCell className="py-3">
                          <ClosingTrend
                            opening={record.opening_bottles ?? 0}
                            closing={record.closing_bottles ?? 0}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {hasPermission("edit") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => { setDialogMode("edit"); setSelectedItem(record); setIsDialogOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {hasPermission("delete") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                onClick={() => handleDelete(record)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      <GrowthRoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </motion.div>
  );
}
