import { ModulePage, Column } from "@/components/ModulePage";
import { mockInoculationRoom } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type Record = (typeof mockInoculationRoom)[0];

const columns: Column<Record>[] = [
  { key: "variety", header: "Variety" },
  { key: "date", header: "Date" },
  { key: "operator", header: "Operator" },
  { key: "cultures", header: "Cultures" },
  { key: "bottles", header: "Bottles" },
  { key: "totalProduced", header: "Total" },
  { key: "remarks", header: "Remarks" },
];

export default function InoculationRoom() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Inoculation Room"
      data={mockInoculationRoom}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
