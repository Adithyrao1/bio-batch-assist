import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useChemicals, useCreateChemical, useUpdateChemical, useDeleteChemical, useAdjustChemicalStock,
  useStockPreparations, useDeleteStockPreparation, useStockSolutions
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, Plus, Minus, FlaskConical, AlertTriangle, ShieldCheck, ShieldAlert,
  Search, RefreshCw, Pencil, Trash2, CalendarClock, Beaker, FileText 
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import ChemicalDialog from "@/components/ChemicalDialog";
import StockPreparationDialog from "@/components/StockPreparationDialog";
import type { Chemical, ChemicalCreate } from "@/types/api";
import { FilterBar, type FilterConfig } from "@/components/FilterBar";
import { cn } from "@/lib/utils";

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

function StockBar({ remaining, quantity, id, adjustingId, onAdjust }: {
  remaining: number; quantity: number; id: number;
  adjustingId: number | null; onAdjust: (id: number, delta: number) => void;
}) {
  const pct = quantity > 0 ? Math.min((remaining / quantity) * 100, 100) : 0;
  const level = stockLevel(remaining, quantity);
  const barColor =
    level === "critical" ? "bg-red-500"
    : level === "low"   ? "bg-amber-500"
    :                      "bg-emerald-500";

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <Button size="icon" variant="ghost"
        className="h-6 w-6 rounded-sm border border-border hover:border-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
        onClick={(e) => { e.stopPropagation(); onAdjust(id, -1); }}
        disabled={adjustingId === id || remaining <= 0}>
        {adjustingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
      </Button>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-bold tabular-nums text-foreground">{remaining}</span>
          <span className="text-[9px] text-muted-foreground">/ {quantity}</span>
        </div>
        <div className="h-1 rounded-sm bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full rounded-sm", barColor)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
      <Button size="icon" variant="ghost"
        className="h-6 w-6 rounded-sm border border-border hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0"
        onClick={(e) => { e.stopPropagation(); onAdjust(id, 1); }}
        disabled={adjustingId === id}>
        {adjustingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function ExpiryCell({ date }: { date: string }) {
  const expired = isExpired(date);
  const days = daysUntilExpiry(date);
  const soon = !expired && days <= 30;
  if (expired) {
    return (
      <div className="flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-red-500 font-semibold text-[11px]">{date}</span>
        <span className="inline-flex items-center rounded-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider">Expired</span>
      </div>
    );
  }
  if (soon) {
    return (
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">{date}</span>
        <span className="inline-flex items-center rounded-sm bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider">{days}d</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      <span className="text-[11px] text-muted-foreground">{date}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accentClass, delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accentClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        "relative overflow-hidden rounded-md border bg-card p-4 shadow-sm border-l-4",
        accentClass
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-md p-1.5 bg-muted/80">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Chemicals() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"chemicals" | "stocks">("chemicals");

  // Chemicals Hooks
  const { data: chemData, isLoading: chemLoading, isError: chemError, refetch: refetchChem } = useChemicals({ page_size: 1000 });
  const createChemical = useCreateChemical();
  const updateChemical = useUpdateChemical();
  const deleteChemical = useDeleteChemical();
  const adjustStock = useAdjustChemicalStock();

  // Stock Preparations Hooks
  const { data: prepData, isLoading: prepLoading, isError: prepError, refetch: refetchPrep } = useStockPreparations({ page_size: 1000 });
  const { data: masterStocksData } = useStockSolutions({ page_size: 1000 });
  const deletePrep = useDeleteStockPreparation();

  // States for Chemicals
  const [isChemDialogOpen, setIsChemDialogOpen] = useState(false);
  const [chemDialogMode, setChemDialogMode] = useState<"create" | "edit">("create");
  const [selectedChem, setSelectedChem] = useState<Chemical | null>(null);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [chemSearch, setChemSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // States for Stock Preps
  const [isPrepDialogOpen, setIsPrepDialogOpen] = useState(false);
  const [chemPage, setChemPage] = useState(1);
  const [prepPage, setPrepPage] = useState(1);
  const itemsPerPage = 10;
  
  const allChemicals = chemData?.results ?? [];
  const allPreps = prepData?.results ?? [];
  const masterStocks = masterStocksData?.results ?? [];

  const totalChemicals = allChemicals.length;
  const expiredCount = allChemicals.filter((r) => isExpired(r.expiry_date)).length;
  const lowStockCount = allChemicals.filter((r) => stockLevel(r.remaining_stock, r.quantity) !== "ok").length;

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "expiry", label: "Expiry Status", type: "select", color: "rose", options: [{ value: "valid", label: "Valid" }, { value: "expired", label: "Expired" }], placeholder: "All" },
    { key: "stock", label: "Stock Level", type: "select", color: "amber", options: [{ value: "low", label: "Low / Critical (≤30%)" }, { value: "ok", label: "Sufficient (>30%)" }], placeholder: "All" },
  ], []);

  const filteredChemicals = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { expiry, stock } = filterValues;
    const expiryVals = expiry ? expiry.split(",") : [];
    const stockVals = stock ? stock.split(",") : [];
    const q = chemSearch.trim().toLowerCase();
    return allChemicals.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.supplier ?? "").toLowerCase().includes(q)) return false;
      if (expiryVals.includes("expired") && !expiryVals.includes("valid") && r.expiry_date >= todayStr) return false;
      if (expiryVals.includes("valid") && !expiryVals.includes("expired") && r.expiry_date < todayStr) return false;
      const lvl = stockLevel(r.remaining_stock, r.quantity);
      if (stockVals.includes("low") && !stockVals.includes("ok") && lvl === "ok") return false;
      if (stockVals.includes("ok") && !stockVals.includes("low") && lvl !== "ok") return false;
      return true;
    });
  }, [allChemicals, filterValues, chemSearch]);

  const paginatedChemicals = useMemo(() => {
    return filteredChemicals.slice((chemPage - 1) * itemsPerPage, chemPage * itemsPerPage);
  }, [filteredChemicals, chemPage]);

  const paginatedPreps = useMemo(() => {
    return allPreps.slice((prepPage - 1) * itemsPerPage, prepPage * itemsPerPage);
  }, [allPreps, prepPage]);

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

  const handleChemDelete = (item: Chemical) => {
    if (confirm("Are you sure you want to delete this chemical?")) {
      deleteChemical.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Chemical deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleChemSubmit = async (formData: ChemicalCreate) => {
    try {
      if (chemDialogMode === "create") {
        await createChemical.mutateAsync(formData);
        toast({ title: "Success", description: "Chemical added successfully." });
      } else if (selectedChem) {
        await updateChemical.mutateAsync({ id: selectedChem.id, data: formData });
        toast({ title: "Success", description: "Chemical updated successfully." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save chemical", variant: "destructive" });
      throw err;
    }
  };

  const handlePrepDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this log?")) {
      deletePrep.mutate(id, {
        onSuccess: () => toast({ title: "Deleted", description: "Log deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Flat Industrial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Chemicals & Stocks
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track dry chemicals inventory and log stock solution preparations.
          </p>
        </div>
      </div>

      {/* Flat Tab Control */}
      <div className="flex items-center border-b border-border/60 bg-transparent p-0 h-10 space-x-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("chemicals")}
          className={`flex items-center gap-2 px-1 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all relative ${
            activeTab === "chemicals" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Chemical Inventory
        </button>
        <button
          onClick={() => setActiveTab("stocks")}
          className={`flex items-center gap-2 px-1 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all relative ${
            activeTab === "stocks" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Beaker className="h-3.5 w-3.5" />
          Stock Preparations
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "chemicals" && (
          <motion.div key="chemicals" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={FlaskConical} label="Total Chemicals" value={totalChemicals} sub="registered reagents" accentClass="border-l-blue-600" delay={0.05} />
              <StatCard icon={AlertTriangle} label="Low / Critical" value={lowStockCount} sub={lowStockCount > 0 ? "need restocking" : "all sufficient"} accentClass={lowStockCount > 0 ? "border-l-amber-500" : "border-l-emerald-500"} delay={0.1} />
              <StatCard icon={CalendarClock} label="Expired" value={expiredCount} sub={expiredCount > 0 ? "require disposal" : "none expired"} accentClass={expiredCount > 0 ? "border-l-red-600" : "border-l-emerald-500"} delay={0.15} />
            </div>

            <FilterBar filters={filterConfigs} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => setFilterValues({})} totalCount={allChemicals.length} filteredCount={filteredChemicals.length} />

            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border/40">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search name or supplier..." value={chemSearch} onChange={(e) => setChemSearch(e.target.value)} className="pl-8 h-9 text-xs bg-background" />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 ml-auto w-full sm:w-auto">
                  {expiredCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                      {expiredCount} expired
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => refetchChem()} className="h-9 w-9 p-0"><RefreshCw className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredChemicals.length} of {allChemicals.length}</span>
                    {hasPermission("create") && (
                      <Button size="sm" className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white" onClick={() => { setChemDialogMode("create"); setSelectedChem(null); setIsChemDialogOpen(true); }}>
                        <Plus className="h-3.5 w-3.5" /> Add Chemical
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {chemLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading chemicals...</span>
                </div>
              ) : chemError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <p className="text-xs text-muted-foreground">Failed to load chemicals</p>
                </div>
              ) : filteredChemicals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                  <FlaskConical className="h-9 w-9 opacity-20" />
                  <p className="text-xs">No chemicals found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="text-xs font-semibold text-muted-foreground w-[200px]">Chemical</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Unit</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Supplier</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Mfg Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Expiry</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground w-[220px]">Remaining Stock</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedChemicals.map((item, i) => {
                        const expired = isExpired(item.expiry_date);
                        const lvl = stockLevel(item.remaining_stock, item.quantity);
                        const rowTint = expired 
                          ? "hover:bg-red-50/50 dark:hover:bg-red-950/10" 
                          : lvl === "critical" 
                            ? "hover:bg-rose-50/50 dark:hover:bg-rose-950/10" 
                            : "hover:bg-muted/40 transition-colors";
                        return (
                          <motion.tr 
                            key={item.id} 
                            initial={{ opacity: 0, x: -4 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: 4 }} 
                            transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }} 
                            className={cn("group border-b border-border/45", rowTint)}
                          >
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="rounded-md bg-blue-500/10 p-1.5 shrink-0"><FlaskConical className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>
                                <span className="font-semibold text-xs text-foreground">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="inline-flex items-center rounded-sm bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[10px] font-bold px-2 py-0.5 border border-sky-500/20">{item.unit}</span>
                            </TableCell>
                            <TableCell className="py-2.5"><span className="text-xs text-muted-foreground">{item.supplier || "—"}</span></TableCell>
                            <TableCell className="py-2.5"><span className="text-xs text-muted-foreground font-mono">{item.mfg_date}</span></TableCell>
                            <TableCell className="py-2.5"><ExpiryCell date={item.expiry_date} /></TableCell>
                            <TableCell className="py-2.5"><StockBar remaining={item.remaining_stock} quantity={item.quantity} id={item.id} adjustingId={adjustingId} onAdjust={handleAdjust} /></TableCell>
                            <TableCell className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission("edit") && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => { setChemDialogMode("edit"); setSelectedChem(item); setIsChemDialogOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {hasPermission("delete") && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleChemDelete(item)}>
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
              {filteredChemicals.length > 0 && !chemLoading && !chemError && (
                <Pagination
                  currentPage={chemPage}
                  totalPages={Math.ceil(filteredChemicals.length / itemsPerPage)}
                  onPageChange={setChemPage}
                  hasNext={chemPage < Math.ceil(filteredChemicals.length / itemsPerPage)}
                  hasPrevious={chemPage > 1}
                />
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "stocks" && (
          <motion.div key="stocks" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-6">
            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div>
                  <h3 className="text-sm font-semibold">Stock Preparations</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Logs of prepared stock solutions (automatically deducts chemicals)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => refetchPrep()} className="h-9 w-9 p-0"><RefreshCw className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button size="sm" className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white" onClick={() => setIsPrepDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Log Preparation
                  </Button>
                </div>
              </div>

              {prepLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading logs...</span>
                </div>
              ) : prepError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <p className="text-xs text-muted-foreground">Failed to load logs</p>
                </div>
              ) : allPreps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                  <FileText className="h-9 w-9 opacity-20" />
                  <p className="text-xs">No preparations logged yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Stock Solution</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Volume Prepared</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Prepared By</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedPreps.map((item, i) => (
                        <motion.tr 
                          key={item.id} 
                          initial={{ opacity: 0, x: -4 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, x: 4 }} 
                          transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }} 
                          className="group border-b border-border/40 hover:bg-muted/40 transition-colors"
                        >
                          <TableCell className="py-2.5"><span className="text-xs font-medium">{item.date}</span></TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="rounded-md bg-blue-500/10 p-1.5 shrink-0"><Beaker className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>
                              <span className="font-semibold text-xs">{item.stock_solution_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5"><span className="font-mono text-xs">{item.volume_prepared}</span></TableCell>
                          <TableCell className="py-2.5"><span className="text-xs text-muted-foreground">{item.prepared_by_name}</span></TableCell>
                          <TableCell className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {hasPermission("delete") && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handlePrepDelete(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
              {allPreps.length > 0 && !prepLoading && !prepError && (
                <Pagination
                  currentPage={prepPage}
                  totalPages={Math.ceil(allPreps.length / itemsPerPage)}
                  onPageChange={setPrepPage}
                  hasNext={prepPage < Math.ceil(allPreps.length / itemsPerPage)}
                  hasPrevious={prepPage > 1}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChemicalDialog open={isChemDialogOpen} onOpenChange={setIsChemDialogOpen} mode={chemDialogMode} initialData={selectedChem} onSubmit={handleChemSubmit} />
      <StockPreparationDialog open={isPrepDialogOpen} onOpenChange={setIsPrepDialogOpen} selectedStock={null} allStockSolutions={masterStocks} />
    </div>
  );
}
