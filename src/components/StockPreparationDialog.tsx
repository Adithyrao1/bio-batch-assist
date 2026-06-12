import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStockPreparation } from "@/hooks/useApiQueries";
import { StockSolution, StockSolutionPreparationCreate } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStock: StockSolution | null;
  allStockSolutions: StockSolution[];
}

export default function StockPreparationDialog({ open, onOpenChange, selectedStock, allStockSolutions }: Props) {
  const { toast } = useToast();
  const createStockPrep = useCreateStockPreparation();

  const [stockId, setStockId] = useState<string>("");
  const [volumePrepared, setVolumePrepared] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (open) {
      if (selectedStock) {
        setStockId(selectedStock.id.toString());
      } else {
        setStockId("");
      }
      setVolumePrepared("");
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, selectedStock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockId || !volumePrepared || !date) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    const payload: StockSolutionPreparationCreate = {
      stock_solution: parseInt(stockId),
      volume_prepared: parseFloat(volumePrepared),
      date: date,
    };

    createStockPrep.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Stock Preparation Logged", description: "Chemicals have been automatically deducted from inventory." });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          title: "Cannot Log Preparation",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
          duration: 8000,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Prepare Stock Solution</DialogTitle>
              <DialogDescription>
                Log a new batch of stock solution. Chemicals are deducted automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <form id="stock-prep-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Stock Solution *</Label>
                <Select value={stockId} onValueChange={setStockId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stock solution..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allStockSolutions.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preparation Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Volume Prepared *</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    value={volumePrepared} 
                    onChange={(e) => setVolumePrepared(e.target.value)} 
                    placeholder="e.g. 10" 
                    required 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                    {stockId ? allStockSolutions.find(s => s.id.toString() === stockId)?.unit || 'units' : 'units'}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/10">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="stock-prep-form" disabled={createStockPrep.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {createStockPrep.isPending ? "Saving..." : "Log Preparation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
