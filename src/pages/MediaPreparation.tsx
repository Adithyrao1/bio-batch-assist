import { ModulePage, Column } from "@/components/ModulePage";
import { useMediaPreparation, useDeleteMediaPreparation } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import type { MediaPreparation } from "@/types/api";

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
  const deleteRecord = useDeleteMediaPreparation();

  const handleDelete = (item: MediaPreparation) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Media Preparation"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Batch: ${item.batch_number}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing batch ${item.batch_number}` })}
      onDelete={handleDelete}
    />
  );
}
