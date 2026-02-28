import { ModulePage, Column } from "@/components/ModulePage";
import { mockMediaPreparation } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type Record = (typeof mockMediaPreparation)[0];

const columns: Column<Record>[] = [
  { key: "batchNumber", header: "Batch #" },
  { key: "prepDate", header: "Prep Date" },
  { key: "mediaType", header: "Media Type" },
  { key: "quantity", header: "Quantity" },
  { key: "bottlesPrepared", header: "Bottles" },
  { key: "preparedBy", header: "Prepared By" },
  { key: "bottlesIssued", header: "Issued" },
];

export default function MediaPreparation() {
  const { toast } = useToast();
  return (
    <ModulePage
      title="Media Preparation"
      data={mockMediaPreparation}
      columns={columns}
      onAddNew={() => toast({ title: "Add New", description: "Form will be available with backend integration." })}
      onView={() => toast({ title: "View Record" })}
      onEdit={() => toast({ title: "Edit Record" })}
      onDelete={() => toast({ title: "Delete Record", variant: "destructive" })}
    />
  );
}
