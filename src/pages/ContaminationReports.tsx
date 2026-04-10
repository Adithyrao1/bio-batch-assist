import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import { useContaminationReports, useCreateContaminationReport, useUpdateContaminationReport, useDeleteContaminationReport } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import ContaminationReportDialog from "@/components/ContaminationReportDialog";
import type { ContaminationReport, ContaminationReportCreate } from "@/types/api";

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
  const createRecord = useCreateContaminationReport();
  const updateRecord = useUpdateContaminationReport();
  const deleteRecord = useDeleteContaminationReport();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<ContaminationReport | null>(null);

  const handleDelete = (item: ContaminationReport) => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Report deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: ContaminationReportCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Report added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Report updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save report", variant: "destructive" });
      throw err;
    }
  };

  return (
    <>
      <ModulePage
        title="Contamination Reports"
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
      <ContaminationReportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
