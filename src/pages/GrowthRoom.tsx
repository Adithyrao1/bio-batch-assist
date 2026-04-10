import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import { useGrowthRoom, useCreateGrowthRoom, useUpdateGrowthRoom, useDeleteGrowthRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import GrowthRoomDialog from "@/components/GrowthRoomDialog";
import type { GrowthRoom, GrowthRoomCreate } from "@/types/api";

const columns: Column<GrowthRoom>[] = [
  { key: "variety_code", header: "Variety" },
  { key: "ltd_date", header: "LTD Date" },
  { key: "opening_bottles", header: "Open Bottles" },
  { key: "opening_cultures", header: "Open Cultures" },
  { key: "contaminated_bottles", header: "Contaminated" },
  { key: "closing_bottles", header: "Close Bottles" },
  { key: "closing_cultures", header: "Close Cultures" },
];

export default function GrowthRoom() {
  const { toast } = useToast();
  const { data, isLoading } = useGrowthRoom();
  const createRecord = useCreateGrowthRoom();
  const updateRecord = useUpdateGrowthRoom();
  const deleteRecord = useDeleteGrowthRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<GrowthRoom | null>(null);

  const handleDelete = (item: GrowthRoom) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: GrowthRoomCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Growth room record added." });
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
        title="Growth Room"
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

      <GrowthRoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
