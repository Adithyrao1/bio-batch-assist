import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInoculationRoom, useCreateInoculationRoom, useUpdateInoculationRoom, useDeleteInoculationRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InoculationRoomDialog from "@/components/InoculationRoomDialog";
import type { InoculationRoom as InoculationRoomRecord, InoculationRoomCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Scissors, TestTubeDiagonal, Dna, PackageCheck, User2,
  Search, Plus, Download, Loader2, AlertTriangle, RefreshCw,
  Pencil, Trash2, CalendarDays, MessageSquare,
} from "lucide-react";

// ─── Variety color palette ────────────────────────────────────────────────
const VARIETY_PALETTE = [
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800/50",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50",
  "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50",
];

// ─── Cultures vs Bottles split bar ───────────────────────────────────────
// cultures + bottles are the raw inputs; total_produced is the backend yield.
// This bar shows the culture:bottle composition of this session's inputs.
function InputSplitBar({ cultures, bottles }: { cultures: number; bottles: number }) {
  const total = (cultures ?? 0) + (bottles ?? 0);
  if (total === 0) return <span className="text-xs text-muted-foreground/50">—</span>;
  const cultPct = Math.round((cultures / total) * 100);
  const bottlePct = 100 - cultPct;
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-baseline justify-between text-xs tabular-nums">
        <span className="text-violet-600 dark:text-violet-400 font-semibold">{cultures}c</span>
        <span className="text-indigo-500 dark:text-indigo-400 font-semibold">{bottles}b</span>
      </div>
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cultPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-violet-400 dark:bg-violet-500"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${bottlePct}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
          className="h-full bg-indigo-400 dark:bg-indigo-500"
        />
      </div>
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

export default function InoculationRoom() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useInoculationRoom();
  const createRecord = useCreateInoculationRoom();
  const updateRecord = useUpdateInoculationRoom();
  const deleteRecord = useDeleteInoculationRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<InoculationRoomRecord | null>(null);
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
  const operatorOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.operator_name).filter(Boolean))) as string[],
    [allRecords]
  );

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "variety", label: "Variety", type: "select", color: "violet", options: varietyOptions.map((v) => ({ value: v, label: v })), placeholder: "All varieties" },
    { key: "operator", label: "Operator", type: "select", color: "teal", options: operatorOptions.map((o) => ({ value: o, label: o })), placeholder: "All operators" },
    { key: "dateFrom", label: "Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "Date To", type: "date", color: "orange" },
  ], [varietyOptions, operatorOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // ─── Filtered + searched data ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    const { variety, operator, dateFrom, dateTo } = filterValues;
    const varieties = variety ? variety.split(",") : [];
    const operators = operator ? operator.split(",") : [];
    return allRecords.filter((r) => {
      if (varieties.length > 0 && !varieties.includes(r.variety_code)) return false;
      if (operators.length > 0 && !operators.includes(r.operator_name)) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [allRecords, filterValues]);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const q = search.toLowerCase();
    return filteredData.filter((r) =>
      [r.variety_code, r.operator_name, r.date, r.remarks]
        .some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [filteredData, search]);

  // ─── Stats ─────────────────────────────────────────────────────────────
  // total_produced is the authoritative yield figure from the backend.
  // We do NOT re-calculate it — we aggregate what the server already computed.
  // avg_per_session = total_produced / number of sessions (meaningful throughput metric)
  // top_operator = operator whose sessions sum to the highest total_produced
  const stats = useMemo(() => {
    const totalProduced = allRecords.reduce((s, r) => s + (r.total_produced ?? 0), 0);
    const totalSessions = allRecords.length;
    const avgPerSession = totalSessions > 0 ? Math.round(totalProduced / totalSessions) : 0;

    // Operator leaderboard by total_produced
    const opMap: Record<string, number> = {};
    allRecords.forEach((r) => {
      if (r.operator_name) {
        opMap[r.operator_name] = (opMap[r.operator_name] ?? 0) + (r.total_produced ?? 0);
      }
    });
    const topOperator = Object.entries(opMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return { totalProduced, totalSessions, avgPerSession, topOperator };
  }, [allRecords]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleFilterChange = (key: string, value: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilterValues({});

  const handleDelete = (item: InoculationRoomRecord) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: InoculationRoomCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Inoculation record added." });
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
    const headers = ["Date", "Variety", "Operator", "Cultures", "Bottles", "Total Produced", "Remarks"];
    const rows = displayData.map((r) => [
      r.date, r.variety_code ?? "", r.operator_name ?? "",
      r.cultures, r.bottles, r.total_produced, r.remarks ?? "",
    ].map((v) => `"${v}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "inoculation-room.csv" });
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-indigo-900 dark:via-violet-800 dark:to-fuchsia-900 p-6 shadow-lg shadow-violet-500/25">
        {/* Circuit-board dot grid decoration */}
        <svg className="absolute right-0 top-0 h-full w-72 opacity-[0.07] pointer-events-none" viewBox="0 0 288 200" fill="none">
          {[20, 60, 100, 140, 180].map((y) =>
            [20, 60, 100, 140, 180, 220, 260].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="white" />
            ))
          )}
          <path d="M20 20 H100 V60 H180 V100 H260" stroke="white" strokeWidth="1" />
          <path d="M60 60 V140 H140 V180" stroke="white" strokeWidth="1" />
          <path d="M140 20 V60 H220 V140" stroke="white" strokeWidth="1" />
          <path d="M20 100 H60 V180 H140" stroke="white" strokeWidth="0.75" />
        </svg>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex-shrink-0">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Inoculation Room</h1>
              <p className="text-sm text-white/70 mt-0.5">Culture & bottle inoculation · operator tracking · yield production</p>
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
                className="h-9 bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-lg shadow-black/10 transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      {/* 
        Stat logic:
        - Total Sessions: simple record count
        - Total Produced: sum of total_produced from backend (authoritative yield)
        - Avg / Session: total_produced ÷ sessions (throughput rate)
        - Top Operator: operator whose sessions sum to the highest total_produced
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Scissors}        label="Total Sessions"   value={stats.totalSessions}   sub={`${displayData.length} showing`}           colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"   delay={0.05} />
        <StatCard icon={PackageCheck}    label="Total Produced"   value={stats.totalProduced}   sub="backend-computed yield"                     colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"   delay={0.1} />
        <StatCard icon={TestTubeDiagonal} label="Avg / Session"   value={stats.avgPerSession}   sub="produced ÷ sessions"                        colorClass="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" delay={0.15} />
        <StatCard icon={User2}           label="Top Operator"     value={stats.topOperator}     sub="by total produced"                          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"   delay={0.2} />
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
              placeholder="Search variety, operator…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-background/60 border-border/60"
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{displayData.length}</span> session{displayData.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">Loading inoculation data…</p>
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
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Scissors className="h-7 w-7 text-violet-500" />
            </div>
            <p className="font-semibold text-foreground">No sessions found</p>
            <p className="text-sm text-muted-foreground">Adjust filters or log a new session.</p>
          </div>

        /* Table */
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Date</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Variety</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Operator</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex flex-col leading-tight">
                    <span>Input Split</span>
                    <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal font-normal">
                      <span className="text-violet-500">■</span> cult &nbsp;
                      <span className="text-indigo-400">■</span> btl
                    </span>
                  </div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">
                  <div className="flex flex-col leading-tight items-center">
                    <span>Produced</span>
                    <span className="text-muted-foreground/50 text-[10px] normal-case tracking-normal font-normal">backend total</span>
                  </div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Remarks</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {displayData.map((record, i) => {
                  const varColor = varietyColorMap[record.variety_code ?? ""] ?? VARIETY_PALETTE[0];
                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className="group border-b border-border/40 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors duration-150"
                    >
                      {/* Date */}
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                        {record.date}
                      </TableCell>

                      {/* Variety */}
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${varColor}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
                          {record.variety_code ?? "—"}
                        </span>
                      </TableCell>

                      {/* Operator */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {(record.operator_name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[110px]">
                            {record.operator_name ?? "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Input split bar: cultures vs bottles */}
                      <TableCell className="py-3">
                        <InputSplitBar
                          cultures={record.cultures ?? 0}
                          bottles={record.bottles ?? 0}
                        />
                      </TableCell>

                      {/* Total Produced — authoritative backend value */}
                      <TableCell className="text-center py-3">
                        <span className="inline-flex items-center justify-center h-7 min-w-12 px-3 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/60 dark:border-fuchsia-800/40 text-sm font-bold tabular-nums">
                          {record.total_produced ?? 0}
                        </span>
                      </TableCell>

                      {/* Remarks */}
                      <TableCell className="py-3 max-w-[200px]">
                        {record.remarks?.trim() ? (
                          <span className="text-sm text-foreground/80 line-clamp-1">{record.remarks}</span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {hasPermission("edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
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
        )}
      </motion.div>

      <InoculationRoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </motion.div>
  );
}
