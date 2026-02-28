import { ModulePage, Column } from "@/components/ModulePage";
import { mockChemicals } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Record = (typeof mockChemicals)[0];

const isExpired = (date: string) => new Date(date) < new Date();

const columns: Column<Record>[] = [
  { key: "name", header: "Chemical" },
  { key: "quantity", header: "Qty" },
  { key: "unit", header: "Unit" },
  { key: "mfgDate", header: "Mfg Date" },
  {
    key: "expiryDate",
    header: "Expiry",
    render: (item) => (
      <span className={isExpired(item.expiryDate) ? "text-destructive font-semibold" : ""}>
        {item.expiryDate}
        {isExpired(item.expiryDate) && <Badge variant="destructive" className="ml-2 text-[10px]">Expired</Badge>}
      </span>
    ),
  },
  { key: "remainingStock", header: "Remaining" },
];

export default function Chemicals() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Chemicals"
      data={mockChemicals}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
