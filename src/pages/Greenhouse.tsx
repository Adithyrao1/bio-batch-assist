import { ModulePage, Column } from "@/components/ModulePage";
import { useGreenhouse, useDeleteGreenhouse } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Greenhouse } from "@/types/api";

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
  const deleteRecord = useDeleteGreenhouse();

  const handleDelete = (item: Greenhouse) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Greenhouse"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Batch ${item.batch_number}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing batch ${item.batch_number}` })}
      onDelete={handleDelete}
    />
  );
}
