import { ModulePage, Column } from "@/components/ModulePage";
import { useContaminationReports, useDeleteContaminationReport } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { ContaminationReport } from "@/types/api";

const columns: Column<ContaminationReport>[] = [
  { key: "variety_code", header: "Variety" },
  {
    key: "source",
    header: "Source",
    render: (item) => (
      <Badge variant={item.source.toLowerCase().includes("fungus") || item.source.toLowerCase().includes("fungal") ? "destructive" : "secondary"}>
        {item.source}
      </Badge>
    ),
  },
  { key: "type_desc", header: "Type" },
  { key: "bottles_affected", header: "Bottles Affected" },
  { key: "operator_name", header: "Operator" },
  { key: "date", header: "Date" },
];

export default function ContaminationReports() {
  const { toast } = useToast();
  const { data, isLoading } = useContaminationReports();
  const deleteRecord = useDeleteContaminationReport();

  const handleDelete = (item: ContaminationReport) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Report deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Contamination Reports"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Report for ${item.variety_code}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing report for ${item.variety_code}` })}
      onDelete={handleDelete}
    />
  );
}
