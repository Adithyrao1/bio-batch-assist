import { ModulePage, Column } from "@/components/ModulePage";
import { useGrowthRoom, useDeleteGrowthRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { GrowthRoom } from "@/types/api";

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
  const deleteRecord = useDeleteGrowthRoom();

  const handleDelete = (item: GrowthRoom) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Growth Room"
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
