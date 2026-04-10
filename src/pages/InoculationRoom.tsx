import { useState } from "react";
import { ModulePage, Column } from "@/components/ModulePage";
import { useInoculationRoom, useCreateInoculationRoom, useUpdateInoculationRoom, useDeleteInoculationRoom } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import InoculationRoomDialog from "@/components/InoculationRoomDialog";
import type { InoculationRoom, InoculationRoomCreate } from "@/types/api";

const columns: Column<InoculationRoom>[] = [
  { key: "variety_code", header: "Variety" },
  { key: "date", header: "Date" },
  { key: "operator_name", header: "Operator" },
  { key: "cultures", header: "Cultures" },
  { key: "bottles", header: "Bottles" },
  { key: "total_produced", header: "Total" },
  { key: "remarks", header: "Remarks" },
];

export default function InoculationRoom() {
  const { toast } = useToast();
  const { data, isLoading } = useInoculationRoom();
  const createRecord = useCreateInoculationRoom();
  const updateRecord = useUpdateInoculationRoom();
  const deleteRecord = useDeleteInoculationRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<InoculationRoom | null>(null);

  const handleDelete = (item: InoculationRoom) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(item.id, {
        onSuccess: () => toast({ title: "Deleted", description: "Record deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDialogSubmit = async (formData: InoculationRoomCreate) => {
    try {
      if (dialogMode === "create") {
        await createRecord.mutateAsync(formData);
        toast({ title: "Success", description: "Inoculation record added." });
      } else if (selectedItem) {
        await updateRecord.mutateAsync({ id: selectedItem.id, data: formData });
        toast({ title: "Success", description: "Record updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save record", variant: "destructive" });
      throw err;
    }
  };

  return (
    <>
      <ModulePage
        title="Inoculation Room"
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

      <InoculationRoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
