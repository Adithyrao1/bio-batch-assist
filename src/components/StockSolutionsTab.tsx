import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStockSolutions, useStockPreparations, useCreateStockPreparation } from "@/hooks/useApiQueries";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlaskConical, Beaker, Plus, Loader2, AlertTriangle, RefreshCw, CalendarDays, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StockPreparationDialog from "./StockPreparationDialog";
import { StockSolution } from "@/types/api";

export default function StockSolutionsTab() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useStockSolutions();
  const allStockSolutions = data?.results ?? [];

  const [prepDialogOpen, setPrepDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSolution | null>(null);

  const handlePrepareStock = (stock?: StockSolution) => {
    setSelectedStock(stock || null);
    setPrepDialogOpen(true);
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Solutions Inventory</h2>
          <p className="text-sm text-muted-foreground">Current available volumes of stock solutions</p>
        </div>
        {hasPermission("create") && (
          <Button onClick={() => handlePrepareStock()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Prepare Stock
          </Button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading stock solutions...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-semibold text-foreground">Failed to load stock solutions</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5 mt-1">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : allStockSolutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Beaker className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground">No stock solutions found</p>
            <p className="text-sm text-muted-foreground">Go to Master Data to add stock solutions or prepare a new one.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Remaining Volume</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Description</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {allStockSolutions.map((stock) => (
                  <motion.tr
                    key={stock.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
                  >
                    <TableCell className="font-medium py-3">{stock.name}</TableCell>
                    <TableCell className="text-center py-3">
                      <span className="inline-flex items-center justify-center h-7 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold tabular-nums dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
                        {stock.remaining_volume} {stock.unit}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm">{stock.description || "—"}</TableCell>
                    <TableCell className="text-right py-3">
                      <Button variant="outline" size="sm" onClick={() => handlePrepareStock(stock)} className="h-7 text-xs">
                        Prepare More
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </motion.div>

      <StockPreparationDialog
        open={prepDialogOpen}
        onOpenChange={setPrepDialogOpen}
        selectedStock={selectedStock}
        allStockSolutions={allStockSolutions}
      />
    </div>
  );
}
