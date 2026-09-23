import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Check, Loader2, Pencil, X } from "lucide-react";
import { useVarieties, useUpdateVariety } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Variety } from "@/types/api";

export default function VarietyMappingPage() {
  const { data, isLoading } = useVarieties({ page_size: 1000 });
  const updateVariety = useUpdateVariety();
  const { toast } = useToast();

  // editingId → the variety currently being inline-edited
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const varieties: Variety[] = data?.results ?? [];

  function startEdit(v: Variety) {
    setEditingId(v.id);
    setEditValue(v.field_code ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(v: Variety) {
    try {
      await updateVariety.mutateAsync({ id: v.id, data: { field_code: editValue.trim() } });
      toast({ title: "Saved", description: `Field code for ${v.code} updated.` });
      cancelEdit();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Variety Code Mapping</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Map each LabNest variety code to its corresponding FieldLink field code.
              This mapping is shown in Transplantation logs.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs font-mono self-start sm:self-auto">
          Admin only
        </Badge>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/40">
              <TableHead className="w-14 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
              <TableHead className="w-36 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                LabNest Code
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Variety Name
              </TableHead>
              <TableHead className="w-56 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                FieldLink Code
              </TableHead>
              <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground/60" />
                </TableCell>
              </TableRow>
            ) : varieties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-xs text-muted-foreground">
                  No varieties found. Add varieties in Lab Master Data first.
                </TableCell>
              </TableRow>
            ) : (
              varieties.map((v, i) => {
                const isEditing = editingId === v.id;
                return (
                  <TableRow key={v.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs border-border/60 bg-muted/10">
                        {v.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{v.name}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(v);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 text-xs font-mono w-44"
                          placeholder="e.g. FLD-SC-001"
                        />
                      ) : v.field_code ? (
                        <Badge className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
                          {v.field_code}
                        </Badge>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground">Not mapped</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => saveEdit(v)}
                            disabled={updateVariety.isPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                          >
                            {updateVariety.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(v)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      <p className="text-[11px] text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-border/60 bg-muted font-mono">Enter</kbd> to save or{" "}
        <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-border/60 bg-muted font-mono">Esc</kbd> to cancel while editing.
      </p>
    </div>
  );
}
