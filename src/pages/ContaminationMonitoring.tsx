import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import {
  useContaminationMonitoring,
  useDeleteContaminationMonitoring,
  useCreateContaminationMonitoring,
  useUpdateContaminationMonitoring,
} from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { ContaminationMonitoring, ContaminationMonitoringCreate } from "@/types/api";
import ContaminationMonitoringDialog from "@/components/ContaminationMonitoringDialog";

const columns: Column<ContaminationMonitoring>[] = [
  { key: "date_time", header: "Date/Time" },
  { key: "area_name", header: "Area" },
  { key: "plates_exposed", header: "Plates" },
  { key: "colony_count", header: "Colonies" },
  { key: "colony_type", header: "Colony Type" },
  { key: "action_taken", header: "Action Taken" },
];

export default function ContaminationMonitoring() {
  const { toast } = useToast();
  const { data, isLoading } = useContaminationMonitoring();
  const createRecord = useCreateContaminationMonitoring();
  const updateRecord = useUpdateContaminationMonitoring();
  const deleteRecord = useDeleteContaminationMonitoring();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRecord, setSelectedRecord] = useState<ContaminationMonitoring | null>(null);

  const handleAddNew = () => {
    setDialogMode("create");
    setSelectedRecord(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: ContaminationMonitoring) => {
    setDialogMode("edit");
    setSelectedRecord(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: ContaminationMonitoring) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleSubmit = async (formData: ContaminationMonitoringCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Record created successfully." });
      } else if (dialogMode === "edit" && selectedRecord) {
        await updateRecord.mutateAsync({ id: selectedRecord.id, data: formData });
        toast({ title: "Success", description: "Record updated successfully." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      throw error; // Throw so dialog stays open with isSubmitting = false
    }
  };

  return (
    <>
      <ModulePage
        title="Contamination Monitoring"
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ContaminationMonitoringDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={selectedRecord}
        mode={dialogMode}
      />
    </>
  );
}
