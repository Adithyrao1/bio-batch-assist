import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import { useGreenhouse, useCreateGreenhouse, useUpdateGreenhouse, useDeleteGreenhouse } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import GreenhouseDialog from "@/components/GreenhouseDialog";
import type { Greenhouse, GreenhouseCreate } from "@/types/api";

const columns: Column<Greenhouse>[] = [
  { key: "variety_code", header: "Variety" },
  { key: "batch_number", header: "Batch #" },
  { key: "transplant_date", header: "Transplant" },
  { key: "operation_description", header: "Operation" },
  {
    key: "finding_names",
    header: "Findings",
    render: (item) => (
      <div className="flex flex-wrap gap-1">
        {(item.finding_names ?? []).map((f) => (
          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
        ))}
      </div>
    ),
  },
  { key: "plantlets_died", header: "Died" },
  { key: "recorded_by_name", header: "Recorded By" },
];

export default function Greenhouse() {
  const { toast } = useToast();
  const { data, isLoading } = useGreenhouse();
  const createRecord = useCreateGreenhouse();
  const updateRecord = useUpdateGreenhouse();
  const deleteRecord = useDeleteGreenhouse();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Greenhouse | null>(null);

  const handleDelete = (item: Greenhouse) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: GreenhouseCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Record added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Record updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save record", variant: "destructive" });
      throw err;
    }
  };

  return (
    <>
      <ModulePage
        title="Greenhouse"
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
      <GreenhouseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
