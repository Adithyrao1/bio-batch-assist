import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChemicals } from "@/hooks/useApiQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chemicalsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";
import { Pagination } from "@/components/Pagination";

export function ChemicalPricingTable({ isAdmin }: { isAdmin: boolean }) {
  const [page, setPage] = useState(1);
  const { data: chemicals, isLoading } = useChemicals({ page_size: 1000 });
  const [editingChemical, setEditingChemical] = useState<any | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePriceMutation = useMutation({
    mutationFn: (data: { id: number; unit_price: number }) => 
      chemicalsApi.update(data.id, { unit_price: data.unit_price } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chemicals"] });
      toast({ title: "Success", description: "Chemical price updated successfully." });
      setEditingChemical(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update price.", variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!editingChemical || !newPrice) return;
    updatePriceMutation.mutate({ 
      id: editingChemical.id, 
      unit_price: parseFloat(newPrice) 
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading chemicals...</div>;

  const itemsPerPage = 10;
  const allChemicals = chemicals?.results || [];
  const paginatedChemicals = allChemicals.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div>
      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Chemical Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Last Updated</TableHead>
              {isAdmin && <TableHead className="w-[100px] text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedChemicals.map((chem) => (
              <TableRow key={chem.id}>
                <TableCell className="font-medium">{chem.name}</TableCell>
                <TableCell>{chem.remaining_stock} {chem.unit}</TableCell>
                <TableCell>
                  {chem.unit_price ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">₹{Number(chem.unit_price).toFixed(2)} / {chem.unit}</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Not set</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {format(new Date(chem.created_at || new Date()), "MMM dd, yyyy")}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setEditingChemical(chem);
                        setNewPrice(chem.unit_price ? String(chem.unit_price) : "");
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {chemicals?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center text-muted-foreground text-xs">
                  No chemicals found in inventory.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {allChemicals.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(allChemicals.length / itemsPerPage)}
            onPageChange={setPage}
            hasNext={page < Math.ceil(allChemicals.length / itemsPerPage)}
            hasPrevious={page > 1}
          />
        )}
      </div>

      <Dialog open={!!editingChemical} onOpenChange={(open) => !open && setEditingChemical(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Update Chemical Price</DialogTitle>
            <DialogDescription className="text-xs">
              Set the unit cost for {editingChemical?.name}. This will be used to calculate future direct costs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold">Price per {editingChemical?.unit} (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="col-span-3 text-xs h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingChemical(null)} className="text-xs h-9">Cancel</Button>
            <Button 
              onClick={handleSave} 
              size="sm"
              disabled={!newPrice || updatePriceMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white text-xs h-9"
            >
              {updatePriceMutation.isPending ? "Saving..." : "Save Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
