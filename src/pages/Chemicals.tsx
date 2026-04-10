import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import { useChemicals, useCreateChemical, useUpdateChemical, useDeleteChemical, useAdjustChemicalStock } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus } from "lucide-react";
import ChemicalDialog from "@/components/ChemicalDialog";
import type { Chemical, ChemicalCreate } from "@/types/api";

const isExpired = (date: string) => new Date(date) < new Date();

export default function Chemicals() {
  const { toast } = useToast();
  const { data, isLoading } = useChemicals();
  const createChemical = useCreateChemical();
  const updateChemical = useUpdateChemical();
  const deleteChemical = useDeleteChemical();
  const adjustStock = useAdjustChemicalStock();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Chemical | null>(null);
  
  // Track specifically which row is mutating to show localized loader
  const [adjustingId, setAdjustingId] = useState<number | null>(null);

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

  const columns: Column<Chemical>[] = [
    { key: "name", header: "Chemical" },
    { key: "quantity", header: "Qty" },
    { key: "unit", header: "Unit" },
    { key: "mfg_date", header: "Mfg Date" },
    {
      key: "expiry_date",
      header: "Expiry",
      render: (item) => (
        <span className={isExpired(item.expiry_date) ? "text-destructive font-semibold" : ""}>
          {item.expiry_date}
          {isExpired(item.expiry_date) && <Badge variant="destructive" className="ml-2 text-[10px]">Expired</Badge>}
        </span>
      ),
    },
    { 
      key: "remaining_stock", 
      header: "Remaining",
      render: (item) => (
        <div className="flex items-center space-x-2">
            <span className="font-medium mr-2">{item.remaining_stock}</span>
            <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 rounded-full"
                onClick={(e) => { e.stopPropagation(); handleAdjust(item.id, -1); }}
                disabled={adjustingId === item.id || item.remaining_stock <= 0}
            >
                {adjustingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
            </Button>
            <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 rounded-full"
                onClick={(e) => { e.stopPropagation(); handleAdjust(item.id, 1); }}
                disabled={adjustingId === item.id}
            >
                {adjustingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
        </div>
      )
    },
  ];

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

  return (
    <>
      <ModulePage
        title="Chemicals"
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        onAddNew={() => {
          setDialogMode("create");
          setSelectedItem(null);
          setIsDialogOpen(true);
        }}
        onEdit={(item) => {
          setDialogMode("edit");
          setSelectedItem(item);
          setIsDialogOpen(true);
        }}
        onDelete={handleDelete}
      />

      <ChemicalDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
