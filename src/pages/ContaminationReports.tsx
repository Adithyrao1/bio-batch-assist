import { ModulePage, Column } from "@/components/ModulePage";
import { mockContaminationReports } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Record = (typeof mockContaminationReports)[0];

const columns: Column<Record>[] = [
  { key: "varietyCode", header: "Variety" },
  {
    key: "source",
    header: "Source",
    render: (item) => (
      <Badge variant={item.source === "Fungus" ? "destructive" : "secondary"}>
        {item.source}
      </Badge>
    ),
  },
  { key: "typeDesc", header: "Type" },
  { key: "bottlesAffected", header: "Bottles Affected" },
  { key: "operator", header: "Operator" },
  { key: "date", header: "Date" },
];

export default function ContaminationReports() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Contamination Reports"
      data={mockContaminationReports}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
