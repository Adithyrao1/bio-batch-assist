import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useContaminationReports,
  useCreateContaminationReport,
  useUpdateContaminationReport,
  useDeleteContaminationReport,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, Activity, ShieldAlert, ShieldCheck,
  Search, RefreshCw, Pencil, Trash2, Plus, Loader2,
  FileText, BarChart3,
} from "lucide-react";
import ContaminationReportDialog from "@/components/ContaminationReportDialog";
import type { ContaminationReport, ContaminationReportCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";

// ─── helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const VARIETY_PALETTE = [
  "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
];
function varietyColor(code = "") {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffff;
  return VARIETY_PALETTE[h % VARIETY_PALETTE.length];
}

const SOURCE_TOKENS: [RegExp, string][] = [
  [/fungal|fungus/i, "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"],
  [/bacterial|bacteria/i, "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"],
  [/yeast/i, "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"],
  [/viral|virus/i, "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"],
];
function sourceColor(source: string) {
  for (const [re, cls] of SOURCE_TOKENS) if (re.test(source)) return cls;
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
}

function severityClass(n: number) {
  if (n === 0) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
  if (n <= 5) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
  if (n <= 20) return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
  return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, colorClass, delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; colorClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative group overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-shadow cursor-default"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colorClass} blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2 ${colorClass} opacity-80`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ContaminationReports() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useContaminationReports();
  const createRecord = useCreateContaminationReport();
  const updateRecord = useUpdateContaminationReport();
  const deleteRecord = useDeleteContaminationReport();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<ContaminationReport | null>(null);
  const [search, setSearch] = useState("");

  const allRecords = data?.results ?? [];

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalReports = allRecords.length;
  const totalBottlesAffected = allRecords.reduce((s, r) => s + r.bottles_affected, 0);

  const mostCommonSource = useMemo(() => {
    const m: Record<string, number> = {};
    allRecords.forEach((r) => { m[r.source] = (m[r.source] ?? 0) + 1; });
    const entries = Object.entries(m);
    return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : "—";
  }, [allRecords]);

  const mostImpactedVariety = useMemo(() => {
    const m: Record<string, number> = {};
    allRecords.forEach((r) => {
      if (r.variety_code) m[r.variety_code] = (m[r.variety_code] ?? 0) + r.bottles_affected;
    });
    const entries = Object.entries(m);
    return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : "—";
  }, [allRecords]);

  // ── filters ────────────────────────────────────────────────────────────────
  const varietyOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.variety_code).filter(Boolean))) as string[], [allRecords]);
  const sourceOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.source).filter(Boolean))) as string[], [allRecords]);
  const typeOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.type_desc).filter(Boolean))) as string[], [allRecords]);
  const operatorOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.operator_name).filter(Boolean))) as string[], [allRecords]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "variety", label: "Variety", type: "select", color: "emerald", options: varietyOptions.map((v) => ({ value: v, label: v })), placeholder: "All varieties" },
    { key: "source", label: "Source", type: "select", color: "rose", options: sourceOptions.map((s) => ({ value: s, label: s })), placeholder: "All sources" },
    { key: "type", label: "Type", type: "select", color: "violet", options: typeOptions.map((t) => ({ value: t, label: t })), placeholder: "All types" },
    { key: "operator", label: "Operator", type: "select", color: "sky", options: operatorOptions.map((o) => ({ value: o, label: o })), placeholder: "All operators" },
    { key: "dateFrom", label: "Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "Date To", type: "date", color: "orange" },
  ], [varietyOptions, sourceOptions, typeOptions, operatorOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    const { variety, source, type, operator, dateFrom, dateTo } = filterValues;
    const varieties = variety ? variety.split(",") : [];
    const sources = source ? source.split(",") : [];
    const types = type ? type.split(",") : [];
    const operators = operator ? operator.split(",") : [];
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (q && !(r.variety_code ?? "").toLowerCase().includes(q)
        && !r.source.toLowerCase().includes(q)
        && !(r.type_desc ?? "").toLowerCase().includes(q)
        && !(r.operator_name ?? "").toLowerCase().includes(q)) return false;
      if (varieties.length > 0 && !varieties.includes(r.variety_code ?? "")) return false;
      if (sources.length > 0 && !sources.includes(r.source)) return false;
      if (types.length > 0 && !types.includes(r.type_desc ?? "")) return false;
      if (operators.length > 0 && !operators.includes(r.operator_name ?? "")) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [allRecords, filterValues, search]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleDelete = (item: ContaminationReport) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Report deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: ContaminationReportCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Report added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Report updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save report", variant: "destructive" });
      throw err;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 p-8 shadow-xl"
      >
        {/* SVG: petri dish with colony dots */}
        <svg className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none" width="160" height="160" viewBox="0 0 160 160" fill="none">
          <circle cx="80" cy="80" r="72" stroke="white" strokeWidth="5" fill="none" />
          <circle cx="80" cy="80" r="60" stroke="white" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          <circle cx="55" cy="60" r="8" fill="white" />
          <circle cx="95" cy="55" r="5" fill="white" />
          <circle cx="70" cy="95" r="11" fill="white" />
          <circle cx="110" cy="85" r="6" fill="white" />
          <circle cx="45" cy="100" r="4" fill="white" />
          <circle cx="115" cy="105" r="7" fill="white" />
          <circle cx="80" cy="45" r="4" fill="white" />
        </svg>

        {/* glow blobs */}
        <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-purple-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-56 h-56 rounded-full bg-pink-400/25 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-white/20 backdrop-blur-sm p-2">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Quality Control</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Contamination Reports</h1>
          <p className="text-white/60 text-sm">Track contamination incidents — sources, affected bottles, and outcomes</p>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Reports" value={totalReports}
          sub="logged incidents" colorClass="bg-purple-500" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Bottles Affected" value={totalBottlesAffected}
          sub="total contaminated" colorClass="bg-fuchsia-500" delay={0.1} />
        <StatCard icon={ShieldAlert} label="Top Source" value={mostCommonSource}
          sub="most frequent" colorClass="bg-pink-500" delay={0.15} />
        <StatCard icon={BarChart3} label="Most Hit Variety" value={mostImpactedVariety}
          sub="by bottles lost" colorClass="bg-rose-500" delay={0.2} />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
        onClear={() => setFilterValues({})}
        totalCount={allRecords.length}
        filteredCount={filteredData.length}
      />

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {/* toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search variety, source, type…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background/60"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {filteredData.length} of {allRecords.length}
            </span>
            {hasPermission("create") && (
              <Button size="sm"
                className="h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white border-none"
                onClick={() => { setDialogMode("create"); setSelectedItem(null); setIsDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add Report
              </Button>
            )}
          </div>
        </div>

        {/* table body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-sm">Loading reports…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-8 w-8 text-fuchsia-500" />
            <p className="text-sm text-muted-foreground">Failed to load reports</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
            <ShieldCheck className="h-9 w-9 opacity-20" />
            <p className="text-sm">No contamination reports found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variety</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bottles Affected</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredData.map((item, i) => {
                  const high = item.bottles_affected > 20;
                  return (
                    <motion.tr key={item.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className={`group border-b border-border/40 transition-colors ${
                        high
                          ? "hover:bg-purple-50/50 dark:hover:bg-purple-900/10"
                          : "hover:bg-fuchsia-50/30 dark:hover:bg-fuchsia-900/5"
                      }`}>

                      {/* date */}
                      <TableCell>
                        <span className="font-mono text-xs bg-muted/60 rounded px-1.5 py-0.5">{item.date}</span>
                      </TableCell>

                      {/* variety */}
                      <TableCell>
                        {item.variety_code ? (
                          <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 ${varietyColor(item.variety_code)}`}>
                            {item.variety_code}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* source */}
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 ${sourceColor(item.source)}`}>
                          {item.source}
                        </span>
                      </TableCell>

                      {/* type */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{item.type_desc || "—"}</span>
                      </TableCell>

                      {/* bottles affected */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.bottles_affected > 0 && (
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                                item.bottles_affected > 20 ? "bg-red-400" : item.bottles_affected > 5 ? "bg-orange-400" : "bg-amber-400"
                              }`} />
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                item.bottles_affected > 20 ? "bg-red-500" : item.bottles_affected > 5 ? "bg-orange-500" : "bg-amber-500"
                              }`} />
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full text-[11px] font-bold px-2 py-0.5 ${severityClass(item.bottles_affected)}`}>
                            {item.bottles_affected}
                          </span>
                        </div>
                      </TableCell>

                      {/* operator */}
                      <TableCell>
                        {item.operator_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                              {initials(item.operator_name)}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{item.operator_name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>

                      {/* notes */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">{item.notes || "—"}</span>
                      </TableCell>

                      {/* actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasPermission("edit") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-fuchsia-500"
                              onClick={() => { setDialogMode("edit"); setSelectedItem(item); setIsDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {hasPermission("delete") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600"
                              onClick={() => handleDelete(item)}>
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

      <ContaminationReportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
