import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVariety, useUpdateVariety } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Variety } from "@/types/api";

interface VarietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData: Variety | null;
}

interface FormData {
  code: string;
  name: string;
  description: string;
}

export default function VarietyDialog({ open, onOpenChange, mode, initialData }: VarietyDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { code: "", name: "", description: "" },
  });

  const { toast } = useToast();
  const createVariety = useCreateVariety();
  const updateVariety = useUpdateVariety();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        reset({
          code: initialData.code,
          name: initialData.name,
          description: initialData.description || "",
        });
      } else {
        reset({ code: "", name: "", description: "" });
      }
    }
  }, [open, mode, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === "create") {
        await createVariety.mutateAsync(data);
        toast({ title: "Success", description: "Variety created successfully." });
      } else if (mode === "edit" && initialData) {
        await updateVariety.mutateAsync({ id: initialData.id, data });
        toast({ title: "Success", description: "Variety updated successfully." });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const isPending = createVariety.isPending || updateVariety.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Variety" : "Edit Variety"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new plant variety code for the lab."
              : "Update the details of this variety."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Variety Code</Label>
            <Input
              id="code"
              placeholder="e.g. SC-001"
              {...register("code", { required: "Code is required" })}
            />
            {errors.code && <p className="text-[13px] text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Variety Name</Label>
            <Input
              id="name"
              placeholder="e.g. Sweet Corn V1"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <p className="text-[13px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this variety..."
              {...register("description")}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
