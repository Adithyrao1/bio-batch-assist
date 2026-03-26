import { ModulePage, Column } from "@/components/ModulePage";
import { useContaminationMonitoring, useDeleteContaminationMonitoring } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { ContaminationMonitoring } from "@/types/api";

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
  const deleteRecord = useDeleteContaminationMonitoring();

  const handleDelete = (item: ContaminationMonitoring) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Contamination Monitoring"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Record from ${item.date_time}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing record from ${item.date_time}` })}
      onDelete={handleDelete}
    />
  );
}
