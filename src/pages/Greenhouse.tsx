import { ModulePage, Column } from "@/components/ModulePage";
import { mockGreenhouse } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Record = (typeof mockGreenhouse)[0];

const columns: Column<Record>[] = [
  { key: "variety", header: "Variety" },
  { key: "batchNumber", header: "Batch #" },
  { key: "transplantDate", header: "Transplant" },
  { key: "operationDesc", header: "Operation" },
  {
    key: "findings",
    header: "Findings",
    render: (item) => (
      <div className="flex flex-wrap gap-1">
        {item.findings.map((f) => (
          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
        ))}
      </div>
    ),
  },
  { key: "plantletsDied", header: "Died" },
  { key: "recordedBy", header: "Recorded By" },
];

export default function Greenhouse() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Greenhouse"
      data={mockGreenhouse}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
