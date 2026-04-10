import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useContaminationMonitoring,
  useDeleteContaminationMonitoring,
  useCreateContaminationMonitoring,
  useUpdateContaminationMonitoring,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ContaminationMonitoring, ContaminationMonitoringCreate } from "@/types/api";
import ContaminationMonitoringDialog from "@/components/ContaminationMonitoringDialog";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, Download, Loader2, AlertTriangle, RefreshCw,
  Microscope, MapPin, Activity, Pencil, Trash2, ShieldCheck, ShieldAlert,
  FlaskConical, CalendarDays,
} from "lucide-react";

// ─── Colony type color system ──────────────────────────────────────────────
const COLONY_COLORS: Record<string, { badge: string; dot: string; glow: string }> = {
  Fungal:   { badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/60",   dot: "bg-rose-400",   glow: "shadow-rose-500/20" },
  Bacterial:{ badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/60", dot: "bg-amber-400", glow: "shadow-amber-500/20" },
  Yeast:    { badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/60", dot: "bg-violet-400", glow: "shadow-violet-500/20" },
  None:     { badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", dot: "bg-slate-400", glow: "" },
};
function getColonyColor(type: string) {
  return COLONY_COLORS[type] ?? COLONY_COLORS["None"];
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

export default function ContaminationMonitoringPage() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useContaminationMonitoring();
  const createRecord = useCreateContaminationMonitoring();
  const updateRecord = useUpdateContaminationMonitoring();
  const deleteRecord = useDeleteContaminationMonitoring();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRecord, setSelectedRecord] = useState<ContaminationMonitoring | null>(null);
  const [search, setSearch] = useState("");

  // ─── Source data ────────────────────────────────────────────────────────
  const allRecords = data?.results ?? [];

  // ─── Filter configs ─────────────────────────────────────────────────────
  const areaOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.area_name).filter(Boolean))) as string[],
    [allRecords]
  );
  const colonyTypeOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.colony_type).filter(Boolean))) as string[],
    [allRecords]
  );
  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "area", label: "Area", type: "select", color: "teal", options: areaOptions.map((a) => ({ value: a, label: a })), placeholder: "All areas" },
    { key: "colonyType", label: "Colony Type", type: "select", color: "rose", options: colonyTypeOptions.map((t) => ({ value: t, label: t })), placeholder: "All types" },
    { key: "dateFrom", label: "Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "Date To", type: "date", color: "orange" },
  ], [areaOptions, colonyTypeOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // ─── Filtered + searched data ───────────────────────────────────────────
  const filteredData = useMemo(() => {
    const { area, colonyType, dateFrom, dateTo } = filterValues;
    const areas = area ? area.split(",") : [];
    const colonyTypes = colonyType ? colonyType.split(",") : [];
    return allRecords.filter((r) => {
      if (areas.length > 0 && !areas.includes(r.area_name)) return false;
      if (colonyTypes.length > 0 && !colonyTypes.includes(r.colony_type)) return false;
      if (dateFrom && r.date_time < dateFrom) return false;
      if (dateTo && r.date_time > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [allRecords, filterValues]);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const q = search.toLowerCase();
    return filteredData.filter((r) =>
      [r.area_name, r.colony_type, r.action_taken, String(r.colony_count), String(r.plates_exposed)]
        .some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [filteredData, search]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPlates = allRecords.reduce((s, r) => s + (r.plates_exposed ?? 0), 0);
    const totalColonies = allRecords.reduce((s, r) => s + (r.colony_count ?? 0), 0);
    const areaFreq: Record<string, number> = {};
    allRecords.forEach((r) => { if (r.area_name) areaFreq[r.area_name] = (areaFreq[r.area_name] ?? 0) + 1; });
    const topArea = Object.entries(areaFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { totalPlates, totalColonies, topArea };
  }, [allRecords]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }
  function clearFilters() { setFilterValues({}); }

  const handleAddNew = () => { setDialogMode("create"); setSelectedRecord(null); setDialogOpen(true); };
  const handleEdit = (item: ContaminationMonitoring) => { setDialogMode("edit"); setSelectedRecord(item); setDialogOpen(true); };
  const handleDelete = (item: ContaminationMonitoring) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };
  const handleSubmit = async (formData: ContaminationMonitoringCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Record created successfully." });
      } else if (dialogMode === "edit" && selectedRecord) {
        await updateRecord.mutateAsync({ id: selectedRecord.id, data: formData });
        toast({ title: "Success", description: "Record updated successfully." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      throw error;
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Date/Time", "Area", "Plates Exposed", "Colony Count", "Colony Type", "Action Taken"];
    const rows = displayData.map((r) => [
      r.date_time, r.area_name ?? "", r.plates_exposed ?? "", r.colony_count, r.colony_type, r.action_taken ?? ""
    ].map((v) => `"${v}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "contamination-monitoring.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  // ─── Format date ────────────────────────────────────────────────────────
  function fmtDateTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 dark:from-teal-800 dark:via-cyan-800 dark:to-emerald-800 p-6 shadow-lg shadow-teal-500/20">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 left-12 h-24 w-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex-shrink-0">
              <Microscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Contamination Monitoring</h1>
              <p className="text-sm text-white/70 mt-0.5">Track colony counts, plate exposure, and containment actions</p>
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
                onClick={handleAddNew}
                className="h-9 bg-white text-teal-700 hover:bg-white/90 font-semibold shadow-lg shadow-black/10 transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Record
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity}     label="Total Records"     value={allRecords.length}   sub={`${displayData.length} showing`}  colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"   delay={0.05} />
        <StatCard icon={FlaskConical} label="Plates Exposed"    value={stats.totalPlates}   sub="all time total"                   colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"    delay={0.1} />
        <StatCard icon={Microscope}   label="Total Colonies"    value={stats.totalColonies} sub="colony units"                     colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" delay={0.15} />
        <StatCard icon={MapPin}       label="Most Active Area"  value={stats.topArea}       sub="by record count"                  colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400" delay={0.2} />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={clearFilters}
        totalCount={allRecords.length}
        filteredCount={filteredData.length}
      />

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-background/60 border-border/60"
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{displayData.length}</span> record{displayData.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            <p className="text-sm text-muted-foreground">Loading records…</p>
          </div>

        /* Error */
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-semibold text-foreground">Failed to load data</p>
            <p className="text-sm text-muted-foreground max-w-xs">Could not connect to the server. Check your connection or make sure the backend is running.</p>
            <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 mt-1">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>

        /* Empty */
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <Microscope className="h-7 w-7 text-teal-500" />
            </div>
            <p className="font-semibold text-foreground">No records found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new record.</p>
          </div>

        /* Table */
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground w-44">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Date / Time</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Area</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Plates</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Colonies</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Microscope className="h-3.5 w-3.5" />Colony Type</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action Taken</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {displayData.map((record, i) => {
                  const colony = getColonyColor(record.colony_type);
                  const hasAction = !!(record.action_taken?.trim());
                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className="group border-b border-border/40 hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors duration-150"
                    >
                      {/* Date/Time */}
                      <TableCell className="font-mono text-xs text-muted-foreground py-3">
                        {fmtDateTime(record.date_time)}
                      </TableCell>

                      {/* Area */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-teal-400 flex-shrink-0" />
                          <span className="font-medium text-sm">{record.area_name ?? "—"}</span>
                        </div>
                      </TableCell>

                      {/* Plates */}
                      <TableCell className="text-center py-3">
                        <span className="inline-flex items-center justify-center h-7 w-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-sm font-semibold border border-cyan-200/60 dark:border-cyan-800/40">
                          {record.plates_exposed ?? 0}
                        </span>
                      </TableCell>

                      {/* Colonies */}
                      <TableCell className="text-center py-3">
                        <span className={`inline-flex items-center justify-center h-7 min-w-10 px-2 rounded-lg text-sm font-bold border
                          ${record.colony_count > 0
                            ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40"
                            : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
                          }`}>
                          {record.colony_count}
                        </span>
                      </TableCell>

                      {/* Colony Type */}
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colony.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colony.dot}`} />
                          {record.colony_type || "None"}
                        </span>
                      </TableCell>

                      {/* Action Taken */}
                      <TableCell className="py-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          {hasAction
                            ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            : <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                          }
                          <span className={`text-sm truncate ${hasAction ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
                            {record.action_taken?.trim() || "No action recorded"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {hasPermission("edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                              onClick={() => handleEdit(record)}
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

      <ContaminationMonitoringDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={selectedRecord}
        mode={dialogMode}
      />
    </motion.div>
  );
}
