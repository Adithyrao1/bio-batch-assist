import { ModulePage, Column } from "@/components/ModulePage";
import { mockGrowthRoom } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type Record = (typeof mockGrowthRoom)[0];

const columns: Column<Record>[] = [
  { key: "varietyCode", header: "Variety" },
  { key: "ltdDate", header: "LTD Date" },
  { key: "openingBottles", header: "Open Bottles" },
  { key: "openingCultures", header: "Open Cultures" },
  { key: "contaminatedBottles", header: "Contaminated" },
  { key: "closingBottles", header: "Close Bottles" },
  { key: "closingCultures", header: "Close Cultures" },
];

export default function GrowthRoom() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Growth Room"
      data={mockGrowthRoom}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
