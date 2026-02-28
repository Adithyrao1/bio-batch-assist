import { ModulePage, Column } from "@/components/ModulePage";
import { mockContaminationMonitoring } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type Record = (typeof mockContaminationMonitoring)[0];

const columns: Column<Record>[] = [
  { key: "dateTime", header: "Date/Time" },
  { key: "area", header: "Area" },
  { key: "platesExposed", header: "Plates" },
  { key: "colonyCount", header: "Colonies" },
  { key: "colonyType", header: "Colony Type" },
  { key: "actionTaken", header: "Action Taken" },
];

export default function ContaminationMonitoring() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Contamination Monitoring"
      data={mockContaminationMonitoring}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
