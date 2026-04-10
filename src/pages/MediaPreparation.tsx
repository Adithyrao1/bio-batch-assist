import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import {
  useMediaPreparation,
  useDeleteMediaPreparation,
  useCreateMediaPreparation,
  useUpdateMediaPreparation,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { MediaPreparation, MediaPreparationCreate } from "@/types/api";
import MediaPreparationDialog from "@/components/MediaPreparationDialog";

const columns: Column<MediaPreparation>[] = [
  { key: "batch_number", header: "Batch #" },
  { key: "prep_date", header: "Prep Date" },
  { key: "media_type_name", header: "Media Type" },
  { key: "quantity", header: "Quantity" },
  { key: "bottles_prepared", header: "Bottles" },
  { key: "prepared_by_name", header: "Prepared By" },
  { key: "bottles_issued", header: "Issued" },
];

export default function MediaPreparation() {
  const { toast } = useToast();
  const { data, isLoading } = useMediaPreparation();
  const createRecord = useCreateMediaPreparation();
  const updateRecord = useUpdateMediaPreparation();
  const deleteRecord = useDeleteMediaPreparation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRecord, setSelectedRecord] = useState<MediaPreparation | null>(null);

  const handleAddNew = () => {
    setDialogMode("create");
    setSelectedRecord(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: MediaPreparation) => {
    setDialogMode("edit");
    setSelectedRecord(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: MediaPreparation) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleSubmit = async (formData: MediaPreparationCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Batch created successfully." });
      } else if (dialogMode === "edit" && selectedRecord) {
        await updateRecord.mutateAsync({ id: selectedRecord.id, data: formData });
        toast({ title: "Success", description: "Batch updated successfully." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      throw error; // Keep dialog open if API fails
    }
  };

  return (
    <>
      <ModulePage
        title="Media Preparation"
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <MediaPreparationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={selectedRecord}
        mode={dialogMode}
      />
    </>
  );
}
