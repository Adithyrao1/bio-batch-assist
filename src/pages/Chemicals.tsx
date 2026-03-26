import { ModulePage, Column } from "@/components/ModulePage";
import { useChemicals, useDeleteChemical } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Chemical } from "@/types/api";

const isExpired = (date: string) => new Date(date) < new Date();

const columns: Column<Chemical>[] = [
  { key: "name", header: "Chemical" },
  { key: "quantity", header: "Qty" },
  { key: "unit", header: "Unit" },
  { key: "mfg_date", header: "Mfg Date" },
  {
    key: "expiry_date",
    header: "Expiry",
    render: (item) => (
      <span className={isExpired(item.expiry_date) ? "text-destructive font-semibold" : ""}>
        {item.expiry_date}
        {isExpired(item.expiry_date) && <Badge variant="destructive" className="ml-2 text-[10px]">Expired</Badge>}
      </span>
    ),
  },
  { key: "remaining_stock", header: "Remaining" },
];

export default function Chemicals() {
  const { toast } = useToast();
  const { data, isLoading } = useChemicals();
  const deleteChemical = useDeleteChemical();

  const handleDelete = (item: Chemical) => {
    if (confirm("Are you sure you want to delete this chemical?")) {
      deleteChemical.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Chemical deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <ModulePage
      title="Chemicals"
      data={data?.results ?? []}
      columns={columns}
      isLoading={isLoading}
      onAddNew={() => toast({ title: "Add New", description: "Form dialog coming soon." })}
      onView={(item) => toast({ title: "View", description: `Viewing ${item.name}` })}
      onEdit={(item) => toast({ title: "Edit", description: `Editing ${item.name}` })}
      onDelete={handleDelete}
    />
  );
}
