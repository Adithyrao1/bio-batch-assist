import { ModulePage, Column } from "@/components/ModulePage";
import { useInoculationRoom, useDeleteInoculationRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { InoculationRoom } from "@/types/api";

const columns: Column<InoculationRoom>[] = [
  { key: "variety_code", header: "Variety" },
  { key: "date", header: "Date" },
  { key: "operator_name", header: "Operator" },
  { key: "cultures", header: "Cultures" },
  { key: "bottles", header: "Bottles" },
  { key: "total_produced", header: "Total" },
  { key: "remarks", header: "Remarks" },
];

export default function InoculationRoom() {
  const { toast } = useToast();
  const { data, isLoading } = useInoculationRoom();
  const deleteRecord = useDeleteInoculationRoom();

  const handleDelete = (item: InoculationRoom) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Inoculation Room"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Record from ${item.date}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing record from ${item.date}` })}
      onDelete={handleDelete}
    />
  );
}
