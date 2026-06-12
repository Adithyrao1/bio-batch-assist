import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStockSolution, useUpdateStockSolution } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { StockSolution } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData: StockSolution | null;
}

export default function StockSolutionDialog({ open, onOpenChange, mode, initialData }: Props) {
  const { toast } = useToast();
  const createStock = useCreateStockSolution();
  const updateStock = useUpdateStockSolution();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseVolume, setBaseVolume] = useState("1");
  const [unit, setUnit] = useState("L");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name);
        setDescription(initialData.description || "");
        setBaseVolume(initialData.base_volume ? String(initialData.base_volume) : "1");
        setUnit(initialData.unit);
      } else {
        setName("");
        setDescription("");
        setBaseVolume("1");
        setUnit("L");
      }
    }
  }, [open, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !baseVolume || !unit) {
      toast({ title: "Error", description: "Name, Base Quantity, and Unit are required.", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      description,
      base_volume: parseFloat(baseVolume),
      unit
    };

    try {
      if (mode === "create") {
        await createStock.mutateAsync(payload);
        toast({ title: "Success", description: "Stock solution created." });
      } else if (initialData) {
        await updateStock.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Success", description: "Stock solution updated." });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Operation failed.", variant: "destructive" });
    }
  };

  const isPending = createStock.isPending || updateStock.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Stock Solution" : "Edit Stock Solution"}</DialogTitle>
          <DialogDescription>
            Define a stock solution and its base preparation quantity (e.g., 1 L, 500 ml).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BAP Solution" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Quantity *</Label>
              <Input type="number" step="0.01" min="0" value={baseVolume} onChange={(e) => setBaseVolume(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg">milligram (mg)</SelectItem>
                  <SelectItem value="g">gram (g)</SelectItem>
                  <SelectItem value="kg">kilogram (kg)</SelectItem>
                  <SelectItem value="mL">millilitre (mL)</SelectItem>
                  <SelectItem value="L">litre (L)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Chemicals in the recipe will be specified relative to this base quantity.</p>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
