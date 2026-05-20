import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Pencil, Trash2, Loader2, Leaf, FlaskConical, TestTube2, 
  ChevronDown, ChevronRight, FlaskRound, CalendarCheck, Settings2,
  Trash, Info, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { tasksApi } from "@/lib/api";
import {
  useStockRecipeItems,
  useDeleteStockRecipeItem,
  useStockSolutions,
  useDeleteStockSolution,
  useChemicals,
  useVarieties,
  useDeleteVariety,
} from "@/hooks/useApiQueries";
import StockRecipeItemDialog from "@/components/StockRecipeItemDialog";
import StockSolutionDialog from "@/components/StockSolutionDialog";
import VarietyDialog from "@/components/VarietyDialog";
import type { StockSolution, Variety } from "@/types/api";

export default function MasterData() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("varieties");

  // Variety state
  const [varietyDialogOpen, setVarietyDialogOpen] = useState(false);
  const [varietyDialogMode, setVarietyDialogMode] = useState<"create" | "edit">("create");
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [deletingVarietyId, setDeletingVarietyId] = useState<number | null>(null);

  // Stock Solution state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogMode, setStockDialogMode] = useState<"create" | "edit">("create");
  const [selectedStock, setSelectedStock] = useState<StockSolution | null>(null);

  // Stock Recipes state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialStockId, setInitialStockId] = useState<number | null>(null);
  const [expandedStock, setExpandedStock] = useState<Set<number>>(new Set());

  // Task digest state
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [chemicalLoading, setChemicalLoading] = useState(false);

  // API Queries
  const { data: recipesData, isLoading: reqLoading } = useStockRecipeItems({ page_size: 1000 });
  const { data: stockSolutionsData, isLoading: stockLoading } = useStockSolutions({ page_size: 1000 });
  const { data: chemicalsData } = useChemicals({ page_size: 1000 });
  const { data: varietiesData, isLoading: varietiesLoading } = useVarieties({ page_size: 1000 });
  
  const deleteReq = useDeleteStockRecipeItem();
  const deleteStock = useDeleteStockSolution();
  const deleteVariety = useDeleteVariety();

  const requirements = recipesData?.results ?? [];
  const stockSolutions = stockSolutionsData?.results ?? [];
  const chemicals = chemicalsData?.results ?? [];
  const varieties = varietiesData?.results ?? [];

  // Group recipes by stock solution
  const groupedByStock = useMemo(() => {
    const map = new Map<number, { stock_solution_name: string; items: typeof requirements }>();
    for (const req of requirements) {
      if (!map.has(req.stock_solution)) {
        map.set(req.stock_solution, { 
          stock_solution_name: req.stock_solution_name ?? String(req.stock_solution), 
          items: [] 
        });
      }
      map.get(req.stock_solution)!.items.push(req);
    }
    return Array.from(map.entries()).map(([stock_solution, val]) => ({ stock_solution, ...val }));
  }, [requirements]);

  const toggleStock = (id: number) => {
    setExpandedStock(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Trigger tasks actions
  async function handleTriggerWeeklyDigest() {
    setWeeklyLoading(true);
    try {
      const msg = await tasksApi.triggerWeeklyDigest();
      toast({ title: "Weekly Digest Sent", description: msg });
    } catch {
      toast({ title: "Failed", description: "Could not send weekly digest.", variant: "destructive" });
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function handleTriggerChemicalExpiryDigest() {
    setChemicalLoading(true);
    try {
      const msg = await tasksApi.triggerChemicalExpiryDigest();
      toast({ title: "Chemical Inventory Digest Sent", description: msg });
    } catch {
      toast({ title: "Failed", description: "Could not send chemical digest.", variant: "destructive" });
    } finally {
      setChemicalLoading(false);
    }
  }

  // Tabs layout configuration
  const tabs = [
    { id: "varieties", label: "Plant Varieties", icon: Leaf, count: varieties.length },
    { id: "stocks", label: "Stock Solutions", icon: FlaskConical, count: stockSolutions.length },
    { id: "recipes", label: "Stock Recipes", icon: TestTube2, count: groupedByStock.length },
    ...(isAdmin ? [{ id: "tasks", label: "System Tasks", icon: Settings2, count: 2 }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header section matching LIMS layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Master Data Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure system reference parameters, plant varieties, stock solutions, and chemical recipes.
          </p>
        </div>

        {/* Dynamic Action Button based on tab */}
        <div className="flex items-center gap-2">
          {activeTab === "varieties" && (
            <Button 
              size="sm" 
              onClick={() => { setVarietyDialogMode("create"); setSelectedVariety(null); setVarietyDialogOpen(true); }}
              className="h-8 gap-1.5 text-xs rounded-sm shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Variety
            </Button>
          )}
          {activeTab === "stocks" && (
            <Button 
              size="sm" 
              onClick={() => { setStockDialogMode("create"); setSelectedStock(null); setStockDialogOpen(true); }}
              className="h-8 gap-1.5 text-xs rounded-sm shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Stock Solution
            </Button>
          )}
          {activeTab === "recipes" && (
            <Button 
              size="sm" 
              onClick={() => { setInitialStockId(null); setDialogOpen(true); }}
              className="h-8 gap-1.5 text-xs rounded-sm shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Recipe Item
            </Button>
          )}
        </div>
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
              className={[
                "h-full relative flex items-center gap-2 text-xs font-semibold pb-3 pt-1 transition-colors duration-150 outline-none",
                isActive 
                  ? "text-primary border-b-2 border-primary font-bold" 
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span className={[
                "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                isActive ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
              ].join(" ")}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents Panel */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === "varieties" && (
            <motion.div
              key="varieties"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                      <TableHead className="w-36 text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Variety Name</TableHead>
                      <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varietiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground/60" />
                        </TableCell>
                      </TableRow>
                    ) : varieties.map((item, i) => (
                      <TableRow key={item.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                        <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs border-border/60 bg-muted/10">
                            {item.code || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs">{item.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setVarietyDialogMode("edit"); setSelectedVariety(item); setVarietyDialogOpen(true); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this variety?")) {
                                  setDeletingVarietyId(item.id);
                                  try {
                                    await deleteVariety.mutateAsync(item.id);
                                    toast({ title: "Deleted", description: "Variety deleted successfully." });
                                  } catch (error: any) {
                                    toast({ title: "Error", description: error.message, variant: "destructive" });
                                  } finally {
                                    setDeletingVarietyId(null);
                                  }
                                }
                              }}
                              disabled={deletingVarietyId === item.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                            >
                              {deletingVarietyId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {varieties.length === 0 && !varietiesLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                          No plant varieties defined. Click "Add Variety" to register one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {activeTab === "stocks" && (
            <motion.div
              key="stocks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Solution Name</TableHead>
                      <TableHead className="w-48 text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Volume</TableHead>
                      <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground/60" />
                        </TableCell>
                      </TableRow>
                    ) : stockSolutions.map((stock, i) => (
                      <TableRow key={stock.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                        <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                        <TableCell className="font-medium text-xs">{stock.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-muted/25 border-border/40 text-foreground/80">
                            {stock.base_volume} {stock.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setStockDialogMode("edit"); setSelectedStock(stock); setStockDialogOpen(true); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this stock solution?")) {
                                  deleteStock.mutate(stock.id, {
                                    onSuccess: () => toast({ title: "Deleted", description: "Stock solution deleted successfully." }),
                                    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                                  });
                                }
                              }}
                              disabled={deleteStock.isPending}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                            >
                              {deleteStock.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stockSolutions.length === 0 && !stockLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                          No stock solutions defined. Click "Add Stock Solution" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {activeTab === "recipes" && (
            <motion.div
              key="recipes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Solution (Recipe)</TableHead>
                      <TableHead className="w-48 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chemical Count</TableHead>
                      <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reqLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground/60" />
                        </TableCell>
                      </TableRow>
                    ) : groupedByStock.map((group, i) => {
                      const isOpen = expandedStock.has(group.stock_solution);
                      return (
                        <React.Fragment key={group.stock_solution}>
                          {/* Parent Stock Row */}
                          <TableRow 
                            onClick={() => toggleStock(group.stock_solution)}
                            className="border-border/30 hover:bg-muted/20 cursor-pointer select-none transition-colors"
                          >
                            <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                                )}
                                <span className="font-semibold text-xs text-foreground">
                                  {group.stock_solution_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-mono">
                                {group.items.length} ingredient{group.items.length !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => { setInitialStockId(group.stock_solution); setDialogOpen(true); }}
                                  title="Add chemical ingredient"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border/40 bg-background/50"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Children Chemical Rows */}
                          {isOpen && group.items.map((req, j) => (
                            <TableRow 
                              key={req.id} 
                              className="border-border/10 bg-muted/5 hover:bg-muted/10 transition-colors"
                            >
                              <TableCell className="py-2"></TableCell>
                              <TableCell className="pl-8 py-2 text-xs font-medium text-foreground/80">
                                <div className="flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                  {req.chemical_name}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 font-mono text-xs tabular-nums text-foreground/90">
                                {req.quantity_per_unit} <span className="text-[10px] text-muted-foreground font-semibold">{req.chemical_unit}</span>
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => { setInitialStockId(req.stock_solution); setDialogOpen(true); }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm("Delete this chemical from the recipe?")) {
                                        await deleteReq.mutateAsync(req.id);
                                        toast({ title: "Requirement deleted", variant: "destructive" });
                                      }
                                    }}
                                    disabled={deleteReq.isPending}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    {groupedByStock.length === 0 && !reqLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                          No recipes configured yet. Click "Add Recipe Item" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {activeTab === "tasks" && isAdmin && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm text-primary">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Trigger Digest Reports</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manually dispatch system data aggregates via email to admins.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  
                  <div className="p-4 rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Weekly Summary</span>
                      <h3 className="text-xs font-semibold text-foreground">Weekly Lab Digest</h3>
                      <p className="text-[11px] text-muted-foreground">Triggers notification summaries of weekly contamination occurrences, transplantation summaries, and operational throughput.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={weeklyLoading}
                      onClick={handleTriggerWeeklyDigest}
                      className="w-full gap-2 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 shadow-sm h-8 text-xs rounded-sm"
                    >
                      {weeklyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                      Send Weekly Digest
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Inventory Status</span>
                      <h3 className="text-xs font-semibold text-foreground">Chemical Expiry Report</h3>
                      <p className="text-[11px] text-muted-foreground">Scans chemical records for items past or near their expiration thresholds, alerting procurement logs to potential replenishment needs.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={chemicalLoading}
                      onClick={handleTriggerChemicalExpiryDigest}
                      className="w-full gap-2 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 shadow-sm h-8 text-xs rounded-sm"
                    >
                      {chemicalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskRound className="h-3.5 w-3.5" />}
                      Send Inventory Digest
                    </Button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keep existing functional dialog configurations */}
      <StockRecipeItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stockSolutions={stockSolutions}
        chemicals={chemicals}
        initialStockId={initialStockId}
      />

      <StockSolutionDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        mode={stockDialogMode}
        initialData={selectedStock}
      />

      <VarietyDialog
        open={varietyDialogOpen}
        onOpenChange={setVarietyDialogOpen}
        mode={varietyDialogMode}
        initialData={selectedVariety}
      />

    </div>
  );
}
