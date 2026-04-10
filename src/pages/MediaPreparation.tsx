import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useMediaPreparation,
  useDeleteMediaPreparation,
  useCreateMediaPreparation,
  useUpdateMediaPreparation,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FlaskConical, Beaker, Layers, PackageCheck, Search, Plus, Download,
  Loader2, AlertTriangle, RefreshCw, Pencil, Trash2, CalendarDays, User,
} from "lucide-react";
import type { MediaPreparation, MediaPreparationCreate } from "@/types/api";
import MediaPreparationDialog from "@/components/MediaPreparationDialog";
import BatchChemicalUsageDialog from "@/components/BatchChemicalUsageDialog";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";

// ─── Deterministic media-type color palette ────────────────────────────────
const MEDIA_PALETTE = [
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50",
  "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50",
  "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50",
  "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800/50",
];

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

// ─── Issued ratio mini-bar ─────────────────────────────────────────────────
function IssuedBar({ prepared, issued }: { prepared: number; issued: number }) {
  const pct = prepared > 0 ? Math.min((issued / prepared) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold tabular-nums text-foreground">{issued}</span>
        <span className="text-muted-foreground">/ {prepared}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500"
        />
      </div>
    </div>
  );
}

export default function MediaPreparation() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useMediaPreparation();
  const createRecord = useCreateMediaPreparation();
  const updateRecord = useUpdateMediaPreparation();
  const deleteRecord = useDeleteMediaPreparation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRecord, setSelectedRecord] = useState<MediaPreparation | null>(null);
  const [chemBatch, setChemBatch] = useState<MediaPreparation | null>(null);
  const [search, setSearch] = useState("");

  const allRecords = data?.results ?? [];

  // ─── Media type color index map ─────────────────────────────────────────
  const mediaTypeColorMap = useMemo(() => {
    const types = Array.from(new Set(allRecords.map((r) => r.media_type_name).filter(Boolean))) as string[];
    return Object.fromEntries(types.map((t, i) => [t, MEDIA_PALETTE[i % MEDIA_PALETTE.length]]));
  }, [allRecords]);

  // ─── Filter configs ─────────────────────────────────────────────────────
  const mediaTypeOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.media_type_name).filter(Boolean))) as string[],
    [allRecords]
  );
  const preparedByOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.prepared_by_name).filter(Boolean))) as string[],
    [allRecords]
  );

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "mediaType", label: "Media Type", type: "select", color: "violet", options: mediaTypeOptions.map((t) => ({ value: t, label: t })), placeholder: "All types" },
    { key: "preparedBy", label: "Prepared By", type: "select", color: "emerald", options: preparedByOptions.map((u) => ({ value: u, label: u })), placeholder: "All users" },
    { key: "dateFrom", label: "Prep Date From", type: "date", color: "amber" },
    { key: "dateTo", label: "Prep Date To", type: "date", color: "orange" },
  ], [mediaTypeOptions, preparedByOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // ─── Filtered + searched data ───────────────────────────────────────────
  const filteredData = useMemo(() => {
    const { mediaType, preparedBy, dateFrom, dateTo } = filterValues;
    const mediaTypes = mediaType ? mediaType.split(",") : [];
    const preparedBys = preparedBy ? preparedBy.split(",") : [];
    return allRecords.filter((r) => {
      if (mediaTypes.length > 0 && !mediaTypes.includes(r.media_type_name)) return false;
      if (preparedBys.length > 0 && !preparedBys.includes(r.prepared_by_name)) return false;
      if (dateFrom && r.prep_date < dateFrom) return false;
      if (dateTo && r.prep_date > dateTo) return false;
      return true;
    });
  }, [allRecords, filterValues]);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const q = search.toLowerCase();
    return filteredData.filter((r) =>
      [r.batch_number, r.media_type_name, r.prepared_by_name, r.prep_date]
        .some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [filteredData, search]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalBatches: allRecords.length,
    totalVolume: allRecords.reduce((s, r) => s + (parseFloat(r.quantity as any) || 0), 0).toFixed(1),
    totalBottles: allRecords.reduce((s, r) => s + (r.bottles_prepared ?? 0), 0),
    totalIssued: allRecords.reduce((s, r) => s + (r.bottles_issued ?? 0), 0),
  }), [allRecords]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleFilterChange = (key: string, value: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilterValues({});

  const handleAddNew = () => { setDialogMode("create"); setSelectedRecord(null); setDialogOpen(true); };
  const handleEdit = (item: MediaPreparation) => { setDialogMode("edit"); setSelectedRecord(item); setDialogOpen(true); };
  const handleDelete = (item: MediaPreparation) => {
    if (confirm("Are you sure you want to delete this batch?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Batch deleted." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };
  const handleSubmit = async (formData: MediaPreparationCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Batch created successfully." });
      } else if (dialogMode === "edit" && selectedRecord) {
        await updateRecord.mutateAsync({ id: selectedRecord.id, data: formData });
        toast({ title: "Success", description: "Batch updated successfully." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      throw error;
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Batch #", "Prep Date", "Media Type", "Qty (L)", "Bottles Prepared", "Bottles Issued", "Prepared By"];
    const rows = displayData.map((r) => [
      r.batch_number, r.prep_date, r.media_type_name ?? "", r.quantity ?? "", r.bottles_prepared, r.bottles_issued ?? 0, r.prepared_by_name ?? ""
    ].map((v) => `"${v}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "media-preparation.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-emerald-600 dark:from-amber-700 dark:via-orange-700 dark:to-emerald-800 p-6 shadow-lg shadow-amber-500/20">
        {/* Decorative rings */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full border-[20px] border-white/10 pointer-events-none" />
        <div className="absolute top-4 -right-4 h-24 w-24 rounded-full border-[10px] border-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex-shrink-0">
              <Beaker className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Media Preparation</h1>
              <p className="text-sm text-white/70 mt-0.5">Batch tracking · chemical usage · bottle issuance</p>
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
                className="h-9 bg-white text-amber-700 hover:bg-white/90 font-semibold shadow-lg shadow-black/10 transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> New Batch
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers}      label="Total Batches"   value={stats.totalBatches}  sub={`${displayData.length} showing`}   colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"    delay={0.05} />
        <StatCard icon={FlaskConical} label="Total Volume"   value={`${stats.totalVolume} L`} sub="media prepared"              colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"  delay={0.1} />
        <StatCard icon={Beaker}      label="Bottles Prepared" value={stats.totalBottles} sub="across all batches"               colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" delay={0.15} />
        <StatCard icon={PackageCheck} label="Bottles Issued" value={stats.totalIssued}   sub="dispatched to labs"               colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"  delay={0.2} />
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
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search batches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm bg-background/60 border-border/60"
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{displayData.length}</span> batch{displayData.length !== 1 ? "es" : ""}
          </span>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">Loading batches…</p>
          </div>

        /* Error */
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-semibold text-foreground">Failed to load batches</p>
            <p className="text-sm text-muted-foreground max-w-xs">Could not connect to the server. Check your connection.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5 mt-1">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>

        /* Empty */
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Beaker className="h-7 w-7 text-amber-500" />
            </div>
            <p className="font-semibold text-foreground">No batches found</p>
            <p className="text-sm text-muted-foreground">Adjust filters or create a new batch.</p>
          </div>

        /* Table */
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Batch #</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Prep Date</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Media Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Volume (L)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Issued / Prepared</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Prepared By</div>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Chemicals</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {displayData.map((record, i) => {
                  const mediaColor = mediaTypeColorMap[record.media_type_name ?? ""] ?? MEDIA_PALETTE[0];
                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className="group border-b border-border/40 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors duration-150"
                    >
                      {/* Batch number */}
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 font-mono text-xs font-semibold tracking-wide">
                          {record.batch_number}
                        </span>
                      </TableCell>

                      {/* Prep date */}
                      <TableCell className="text-sm tabular-nums text-muted-foreground py-3">
                        {record.prep_date}
                      </TableCell>

                      {/* Media type */}
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${mediaColor}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
                          {record.media_type_name ?? "—"}
                        </span>
                      </TableCell>

                      {/* Volume */}
                      <TableCell className="text-center py-3">
                        <span className="inline-flex items-center justify-center gap-1 h-7 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/40 text-sm font-bold tabular-nums">
                          {record.quantity ?? 0}
                        </span>
                      </TableCell>

                      {/* Issued / Prepared ratio */}
                      <TableCell className="py-3">
                        <IssuedBar
                          prepared={record.bottles_prepared ?? 0}
                          issued={record.bottles_issued ?? 0}
                        />
                      </TableCell>

                      {/* Prepared by */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {(record.prepared_by_name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[120px]">{record.prepared_by_name ?? "—"}</span>
                        </div>
                      </TableCell>

                      {/* Chemicals button */}
                      <TableCell className="text-center py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="View chemicals used"
                          onClick={(e) => { e.stopPropagation(); setChemBatch(record); }}
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {hasPermission("edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
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

      <MediaPreparationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={selectedRecord}
        mode={dialogMode}
      />

      <BatchChemicalUsageDialog
        batch={chemBatch}
        onOpenChange={(open) => !open && setChemBatch(null)}
      />
    </motion.div>
  );
}
