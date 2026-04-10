import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGreenhouse, useCreateGreenhouse, useUpdateGreenhouse, useDeleteGreenhouse,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Leaf, AlertTriangle, Eye, BarChart3, ShieldCheck,
  Search, RefreshCw, Pencil, Trash2, Plus, Loader2,
} from "lucide-react";
import GreenhouseDialog from "@/components/GreenhouseDialog";
import type { Greenhouse as GreenhouseRecord, GreenhouseCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";

// ─── helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const VARIETY_PALETTE = [
  "bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300",
  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
  "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
];
function varietyColor(code = "") {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffff;
  return VARIETY_PALETTE[h % VARIETY_PALETTE.length];
}

const FINDING_PALETTE = [
  "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
];
function findingColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return FINDING_PALETTE[h % FINDING_PALETTE.length];
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
export default function Greenhouse() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useGreenhouse();
  const createRecord = useCreateGreenhouse();
  const updateRecord = useUpdateGreenhouse();
  const deleteRecord = useDeleteGreenhouse();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<GreenhouseRecord | null>(null);
  const [search, setSearch] = useState("");

  const allRecords = data?.results ?? [];

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalRecords = allRecords.length;
  const totalPlantletsDied = allRecords.reduce((s, r) => s + r.plantlets_died, 0);
  const recordsWithFindings = allRecords.filter((r) => r.findings && r.findings.length > 0).length;

  const mostActiveVariety = useMemo(() => {
    const m: Record<string, number> = {};
    allRecords.forEach((r) => {
      if (r.variety_code) m[r.variety_code] = (m[r.variety_code] ?? 0) + 1;
    });
    const entries = Object.entries(m);
    return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : "—";
  }, [allRecords]);

  // ── filters ────────────────────────────────────────────────────────────────
  const varietyOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.variety_code).filter(Boolean))) as string[], [allRecords]);
  const operationOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.operation_description).filter(Boolean))) as string[], [allRecords]);
  const recordedByOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.recorded_by_name).filter(Boolean))) as string[], [allRecords]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "variety", label: "Variety", type: "select", color: "teal", options: varietyOptions.map((v) => ({ value: v, label: v })), placeholder: "All varieties" },
    { key: "operation", label: "Operation", type: "select", color: "indigo", options: operationOptions.map((o) => ({ value: o, label: o })), placeholder: "All operations" },
    { key: "recordedBy", label: "Recorded By", type: "select", color: "pink", options: recordedByOptions.map((u) => ({ value: u, label: u })), placeholder: "All users" },
    { key: "dateFrom", label: "Transplant From", type: "date", color: "amber" },
    { key: "dateTo", label: "Transplant To", type: "date", color: "orange" },
    { key: "findings", label: "Findings", type: "select", color: "rose", options: [{ value: "yes", label: "Has findings" }, { value: "no", label: "No findings" }], placeholder: "All" },
  ], [varietyOptions, operationOptions, recordedByOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    const { variety, operation, recordedBy, dateFrom, dateTo, findings } = filterValues;
    const varieties = variety ? variety.split(",") : [];
    const operations = operation ? operation.split(",") : [];
    const recorders = recordedBy ? recordedBy.split(",") : [];
    const findingsVals = findings ? findings.split(",") : [];
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (q && !(r.variety_code ?? "").toLowerCase().includes(q)
        && !r.batch_number.toLowerCase().includes(q)
        && !(r.operation_description ?? "").toLowerCase().includes(q)
        && !(r.recorded_by_name ?? "").toLowerCase().includes(q)) return false;
      if (varieties.length > 0 && !varieties.includes(r.variety_code ?? "")) return false;
      if (operations.length > 0 && !operations.includes(r.operation_description ?? "")) return false;
      if (recorders.length > 0 && !recorders.includes(r.recorded_by_name ?? "")) return false;
      if (dateFrom && r.transplant_date < dateFrom) return false;
      if (dateTo && r.transplant_date > dateTo) return false;
      if (findingsVals.includes("yes") && !findingsVals.includes("no") && (!r.findings || r.findings.length === 0)) return false;
      if (findingsVals.includes("no") && !findingsVals.includes("yes") && r.findings && r.findings.length > 0) return false;
      return true;
    });
  }, [allRecords, filterValues, search]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleDelete = (item: GreenhouseRecord) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: GreenhouseCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Record added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Record updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save record", variant: "destructive" });
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-500 via-green-500 to-teal-500 p-8 shadow-xl"
      >
        {/* SVG: stylized plant with roots */}
        <svg className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none" width="140" height="180" viewBox="0 0 140 180" fill="none">
          <path d="M70 170 L70 50" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 110 Q40 90 20 60" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="20" cy="55" rx="18" ry="10" transform="rotate(-30 20 55)" fill="white" />
          <path d="M70 85 Q100 65 120 40" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="120" cy="36" rx="18" ry="10" transform="rotate(30 120 36)" fill="white" />
          <ellipse cx="70" cy="32" rx="15" ry="20" fill="white" />
          <path d="M70 170 Q50 165 30 175" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M70 170 Q90 165 110 175" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M70 170 Q68 162 65 178" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>

        {/* glow blobs */}
        <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-lime-300/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-56 h-56 rounded-full bg-teal-300/25 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-white/20 backdrop-blur-sm p-2">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Cultivation</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Greenhouse</h1>
          <p className="text-white/60 text-sm">Monitor transplant operations, field observations, and plantlet health</p>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Leaf} label="Total Records" value={totalRecords}
          sub="greenhouse entries" colorClass="bg-lime-500" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Plantlets Died" value={totalPlantletsDied}
          sub="total losses"
          colorClass={totalPlantletsDied > 0 ? "bg-rose-500" : "bg-emerald-500"}
          delay={0.1} />
        <StatCard icon={Eye} label="With Findings" value={recordsWithFindings}
          sub={`${totalRecords > 0 ? Math.round((recordsWithFindings / totalRecords) * 100) : 0}% of records`}
          colorClass={recordsWithFindings > 0 ? "bg-amber-500" : "bg-emerald-500"}
          delay={0.15} />
        <StatCard icon={BarChart3} label="Top Variety" value={mostActiveVariety}
          sub="most records" colorClass="bg-teal-500" delay={0.2} />
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
              placeholder="Search variety, batch, operation…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background/60"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {totalPlantletsDied > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium mr-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                {totalPlantletsDied} died
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {filteredData.length} of {allRecords.length}
            </span>
            {hasPermission("create") && (
              <Button size="sm"
                className="h-8 gap-1.5 bg-lime-600 hover:bg-lime-700 text-white border-none"
                onClick={() => { setDialogMode("create"); setSelectedItem(null); setIsDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add Record
              </Button>
            )}
          </div>
        </div>

        {/* table body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-lime-500" />
            <span className="text-sm">Loading records…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-8 w-8 text-lime-500" />
            <p className="text-sm text-muted-foreground">Failed to load records</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
            <Leaf className="h-9 w-9 opacity-20" />
            <p className="text-sm">No greenhouse records found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variety</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch #</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transplant</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operation</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observation</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Findings</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Died</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recorded By</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredData.map((item, i) => {
                  const hasDied = item.plantlets_died > 0;
                  const hasFindings = item.findings && item.findings.length > 0;
                  return (
                    <motion.tr key={item.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className={`group border-b border-border/40 transition-colors ${
                        hasDied
                          ? "hover:bg-rose-50/40 dark:hover:bg-rose-900/10"
                          : "hover:bg-lime-50/40 dark:hover:bg-lime-900/10"
                      }`}>

                      {/* variety */}
                      <TableCell>
                        {item.variety_code ? (
                          <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 ${varietyColor(item.variety_code)}`}>
                            {item.variety_code}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* batch # */}
                      <TableCell>
                        <span className="font-mono text-xs bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800/50 text-lime-700 dark:text-lime-300 rounded px-1.5 py-0.5">
                          {item.batch_number}
                        </span>
                      </TableCell>

                      {/* transplant date */}
                      <TableCell>
                        <span className="font-mono text-xs bg-muted/60 rounded px-1.5 py-0.5">{item.transplant_date}</span>
                      </TableCell>

                      {/* operation */}
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium text-foreground line-clamp-1 max-w-[120px]">
                            {item.operation_description || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">{item.operation_date}</p>
                        </div>
                      </TableCell>

                      {/* observation date */}
                      <TableCell>
                        <span className="font-mono text-xs bg-muted/60 rounded px-1.5 py-0.5">{item.observation_date}</span>
                      </TableCell>

                      {/* findings */}
                      <TableCell>
                        {hasFindings ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {(item.finding_names ?? []).slice(0, 2).map((f) => (
                              <span key={f} className={`inline-flex items-center rounded-full text-[10px] font-semibold px-1.5 py-0.5 ${findingColor(f)}`}>
                                {f}
                              </span>
                            ))}
                            {(item.finding_names ?? []).length > 2 && (
                              <span className="inline-flex items-center rounded-full text-[10px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground">
                                +{(item.finding_names ?? []).length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-[11px] text-muted-foreground">None</span>
                          </div>
                        )}
                      </TableCell>

                      {/* plantlets died */}
                      <TableCell>
                        {hasDied ? (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{item.plantlets_died}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">0</span>
                          </div>
                        )}
                      </TableCell>

                      {/* recorded by */}
                      <TableCell>
                        {item.recorded_by_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-lime-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                              {initials(item.recorded_by_name)}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{item.recorded_by_name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>

                      {/* actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasPermission("edit") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-lime-600"
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

      <GreenhouseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
