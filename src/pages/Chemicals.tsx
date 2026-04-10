import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChemicals, useCreateChemical, useUpdateChemical, useDeleteChemical, useAdjustChemicalStock } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Plus, Minus, FlaskConical, AlertTriangle, ShieldCheck, ShieldAlert,
  Search, RefreshCw, Pencil, Trash2, CalendarClock, Package,
} from "lucide-react";
import ChemicalDialog from "@/components/ChemicalDialog";
import type { Chemical, ChemicalCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";

// ─── helpers ────────────────────────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

function isExpired(date: string) {
  return new Date(date) < today;
}

function daysUntilExpiry(date: string) {
  const diff = new Date(date).getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function stockLevel(remaining: number, quantity: number): "critical" | "low" | "ok" {
  const pct = quantity > 0 ? remaining / quantity : 0;
  if (pct <= 0.1 || remaining <= 5) return "critical";
  if (pct <= 0.3 || remaining <= 15) return "low";
  return "ok";
}

// ─── StockBar widget ─────────────────────────────────────────────────────────
function StockBar({ remaining, quantity, id, adjustingId, onAdjust }: {
  remaining: number; quantity: number; id: number;
  adjustingId: number | null; onAdjust: (id: number, delta: number) => void;
}) {
  const pct = quantity > 0 ? Math.min((remaining / quantity) * 100, 100) : 0;
  const level = stockLevel(remaining, quantity);
  const barColor =
    level === "critical" ? "from-red-500 to-rose-600"
    : level === "low"   ? "from-amber-400 to-orange-500"
    :                      "from-emerald-400 to-green-500";

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      {/* +/- buttons */}
      <Button size="icon" variant="ghost"
        className="h-6 w-6 rounded-full border border-border/60 hover:border-rose-400 hover:text-rose-500 shrink-0"
        onClick={(e) => { e.stopPropagation(); onAdjust(id, -1); }}
        disabled={adjustingId === id || remaining <= 0}>
        {adjustingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
      </Button>

      {/* bar + count */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[11px] font-bold tabular-nums text-foreground">{remaining}</span>
          <span className="text-[10px] text-muted-foreground">/ {quantity}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <Button size="icon" variant="ghost"
        className="h-6 w-6 rounded-full border border-border/60 hover:border-emerald-400 hover:text-emerald-500 shrink-0"
        onClick={(e) => { e.stopPropagation(); onAdjust(id, 1); }}
        disabled={adjustingId === id}>
        {adjustingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  );
}

// ─── ExpiryCell widget ───────────────────────────────────────────────────────
function ExpiryCell({ date }: { date: string }) {
  const expired = isExpired(date);
  const days = daysUntilExpiry(date);
  const soon = !expired && days <= 30;

  if (expired) {
    return (
      <div className="flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-red-500 font-semibold text-xs">{date}</span>
        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-semibold px-1.5 py-0.5">
          Expired
        </span>
      </div>
    );
  }
  if (soon) {
    return (
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">{date}</span>
        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5">
          {days}d
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      <span className="text-xs text-muted-foreground">{date}</span>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, colorClass, delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  colorClass: string; delay?: number;
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
export default function Chemicals() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useChemicals();
  const createChemical = useCreateChemical();
  const updateChemical = useUpdateChemical();
  const deleteChemical = useDeleteChemical();
  const adjustStock = useAdjustChemicalStock();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Chemical | null>(null);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const allRecords = data?.results ?? [];

  // ── stats ────────────────────────────────────────────────────────────────
  const totalChemicals = allRecords.length;
  const totalStock = allRecords.reduce((s, r) => s + r.remaining_stock, 0);
  const expiredCount = allRecords.filter((r) => isExpired(r.expiry_date)).length;
  const lowStockCount = allRecords.filter(
    (r) => stockLevel(r.remaining_stock, r.quantity) !== "ok"
  ).length;

  // ── filters ──────────────────────────────────────────────────────────────
  const unitOptions = useMemo(() =>
    Array.from(new Set(allRecords.map((r) => r.unit).filter(Boolean))) as string[],
    [allRecords]
  );

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "unit", label: "Unit", type: "select", color: "sky", options: unitOptions.map((u) => ({ value: u, label: u })), placeholder: "All units" },
    { key: "expiry", label: "Expiry Status", type: "select", color: "rose", options: [{ value: "valid", label: "Valid" }, { value: "expired", label: "Expired" }], placeholder: "All" },
    { key: "stock", label: "Stock Level", type: "select", color: "amber", options: [{ value: "low", label: "Low / Critical (≤30%)" }, { value: "ok", label: "Sufficient (>30%)" }], placeholder: "All" },
  ], [unitOptions]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { unit, expiry, stock } = filterValues;
    const units = unit ? unit.split(",") : [];
    const expiryVals = expiry ? expiry.split(",") : [];
    const stockVals = stock ? stock.split(",") : [];
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.supplier ?? "").toLowerCase().includes(q)) return false;
      if (units.length > 0 && !units.includes(r.unit)) return false;
      if (expiryVals.includes("expired") && !expiryVals.includes("valid") && r.expiry_date >= todayStr) return false;
      if (expiryVals.includes("valid") && !expiryVals.includes("expired") && r.expiry_date < todayStr) return false;
      const lvl = stockLevel(r.remaining_stock, r.quantity);
      if (stockVals.includes("low") && !stockVals.includes("ok") && lvl === "ok") return false;
      if (stockVals.includes("ok") && !stockVals.includes("low") && lvl !== "ok") return false;
      return true;
    });
  }, [allRecords, filterValues, search]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleAdjust = async (id: number, delta: number) => {
    try {
      setAdjustingId(id);
      await adjustStock.mutateAsync({ id, amount: delta });
      toast({ title: "Updated", description: "Stock updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdjustingId(null);
    }
  };

  const handleDelete = (item: Chemical) => {
    if (confirm("Are you sure you want to delete this chemical?")) {
      deleteChemical.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Chemical deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: ChemicalCreate) => {
    try {
      if (dialogMode === "create") {
        await createChemical.mutateAsync(formData);
        toast({ title: "Success", description: "Chemical added successfully." });
      } else if (selectedItem) {
        await updateChemical.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Chemical updated successfully." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save chemical", variant: "destructive" });
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-600 to-orange-500 p-8 shadow-xl"
      >
        {/* decorative flask silhouette */}
        <svg className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none" width="160" height="180" viewBox="0 0 160 180" fill="none">
          <path d="M55 10 L55 70 L10 150 Q5 165 20 170 L140 170 Q155 165 150 150 L105 70 L105 10 Z" stroke="white" strokeWidth="6" fill="none" strokeLinejoin="round"/>
          <path d="M40 110 Q80 95 120 115" stroke="white" strokeWidth="4" fill="none"/>
          <circle cx="65" cy="130" r="5" fill="white"/>
          <circle cx="95" cy="120" r="3.5" fill="white"/>
          <circle cx="75" cy="145" r="4" fill="white"/>
          <line x1="55" y1="10" x2="105" y2="10" stroke="white" strokeWidth="6" strokeLinecap="round"/>
        </svg>

        {/* glow blobs */}
        <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-red-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-56 h-56 rounded-full bg-orange-400/25 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-white/20 backdrop-blur-sm p-2">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Inventory</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Chemicals</h1>
          <p className="text-white/60 text-sm">Lab reagent stock — track quantities, expiry dates, and supplier info</p>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FlaskConical} label="Total Chemicals" value={totalChemicals}
          sub="registered reagents" colorClass="bg-rose-500" delay={0.05} />
        {/* <StatCard icon={Package} label="Total Stock" value={totalStock}
          sub="units remaining" colorClass="bg-red-500" delay={0.1} /> */}
        <StatCard
          icon={AlertTriangle} label="Low / Critical"
          value={lowStockCount}
          sub={lowStockCount > 0 ? "need restocking" : "all sufficient"}
          colorClass={lowStockCount > 0 ? "bg-amber-500" : "bg-emerald-500"}
          delay={0.15}
        />
        <StatCard
          icon={CalendarClock} label="Expired"
          value={expiredCount}
          sub={expiredCount > 0 ? "require disposal" : "none expired"}
          colorClass={expiredCount > 0 ? "bg-red-600" : "bg-emerald-500"}
          delay={0.2}
        />
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
              placeholder="Search chemicals or supplier…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background/60"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {expiredCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium mr-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                {expiredCount} expired
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
                className="h-8 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white border-none"
                onClick={() => { setDialogMode("create"); setSelectedItem(null); setIsDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add Chemical
              </Button>
            )}
          </div>
        </div>

        {/* table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            <span className="text-sm">Loading chemicals…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">Failed to load chemicals</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
            <FlaskConical className="h-9 w-9 opacity-20" />
            <p className="text-sm">No chemicals found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">Chemical</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unit</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mfg Date</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[220px]">Remaining Stock</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredData.map((item, i) => {
                  const expired = isExpired(item.expiry_date);
                  const lvl = stockLevel(item.remaining_stock, item.quantity);
                  const rowTint = expired
                    ? "hover:bg-red-50/50 dark:hover:bg-red-900/10"
                    : lvl === "critical"
                    ? "hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                    : "hover:bg-orange-50/30 dark:hover:bg-orange-900/5";

                  return (
                    <motion.tr key={item.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      className={`group border-b border-border/40 ${rowTint} transition-colors`}>

                      {/* name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-rose-100 dark:bg-rose-900/30 p-1.5 shrink-0">
                            <FlaskConical className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <span className="font-semibold text-sm text-foreground">{item.name}</span>
                        </div>
                      </TableCell>

                      {/* unit */}
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-[11px] font-semibold px-2 py-0.5">
                          {item.unit}
                        </span>
                      </TableCell>

                      {/* supplier */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{item.supplier || "—"}</span>
                      </TableCell>

                      {/* mfg date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">{item.mfg_date}</span>
                      </TableCell>

                      {/* expiry */}
                      <TableCell>
                        <ExpiryCell date={item.expiry_date} />
                      </TableCell>

                      {/* stock bar */}
                      <TableCell>
                        <StockBar
                          remaining={item.remaining_stock}
                          quantity={item.quantity}
                          id={item.id}
                          adjustingId={adjustingId}
                          onAdjust={handleAdjust}
                        />
                      </TableCell>

                      {/* actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasPermission("edit") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rose-500"
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

      <ChemicalDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
