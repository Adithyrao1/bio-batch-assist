import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useCreateStockRecipeItem } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Chemical, StockSolution } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockSolutions: StockSolution[];
  chemicals: Chemical[];
  initialStockId: number | null;
}

export default function StockRecipeItemDialog({ open, onOpenChange, stockSolutions, chemicals, initialStockId }: Props) {
  const { toast } = useToast();
  const createReq = useCreateStockRecipeItem();
  
  const [stockSolution, setStockSolution] = useState<string>("");
  const [chemical, setChemical] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  useEffect(() => {
    if (open) {
      setStockSolution(initialStockId ? String(initialStockId) : "");
      setChemical("");
      setQuantity("");
    }
  }, [open, initialStockId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockSolution || !chemical || !quantity) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      await createReq.mutateAsync({
        stock_solution: parseInt(stockSolution),
        chemical: parseInt(chemical),
        quantity_per_unit: parseFloat(quantity),
      });
      toast({ title: "Success", description: "Chemical added to recipe." });
      setChemical("");
      setQuantity("");
      if (!initialStockId) {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add to recipe.", variant: "destructive" });
    }
  };

  const selectedChemical = chemicals.find(c => c.id === parseInt(chemical));
  const selectedStockObj = stockSolutions.find(s => s.id === parseInt(stockSolution));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Chemical to Recipe</DialogTitle>
          <DialogDescription>
            Specify the amount of chemical required for the defined base quantity of the stock solution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Stock Solution</Label>
            <Select value={stockSolution} onValueChange={setStockSolution}>
              <SelectTrigger>
                <SelectValue placeholder="Select stock solution" />
              </SelectTrigger>
              <SelectContent>
                {stockSolutions.map(st => (
                  <SelectItem key={st.id} value={String(st.id)}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStockObj && (
              <Alert className="bg-sky-500/10 text-sky-600 border-sky-500/20 py-2 mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This recipe is being defined for a base volume of <strong className="font-semibold">{selectedStockObj.base_volume} {selectedStockObj.unit}</strong>.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>Chemical</Label>
            <Select value={chemical} onValueChange={setChemical}>
              <SelectTrigger>
                <SelectValue placeholder="Select chemical" />
              </SelectTrigger>
              <SelectContent>
                {chemicals.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity Required ({selectedChemical?.unit || "unit"})</Label>
            <Input 
              type="number" 
              step="0.001"
              min="0"
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              placeholder="e.g. 5.5"
            />
            {stockSolution ? (
              <p className="text-xs text-muted-foreground">
                Enter the amount of chemical required for {selectedStockObj?.base_volume || 1} {selectedStockObj?.unit || 'unit'}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Select a stock solution first.</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={createReq.isPending}>
              {createReq.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add to Recipe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
