import { useState } from "react";
import { motion } from "framer-motion";
import {
  useManpowerExpenses,
  useCreateManpowerExpense,
  useUpdateManpowerExpense,
  useDeleteManpowerExpense,
  useUsers,
} from "@/hooks/useApiQueries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, IndianRupee, Loader2, Plus, Pencil, Trash2, TrendingUp, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import type { ManpowerExpense } from "@/types/api";

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────
function SalaryDialog({
  open, onClose, editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: ManpowerExpense | null;
}) {
  const { toast } = useToast();
  const { data: usersData } = useUsers({ role: "technician", status: "active" });
  const technicians = usersData?.results ?? [];

  const [technicianId, setTechnicianId] = useState<string>(
    editTarget ? String(editTarget.technician) : ""
  );
  const [monthlySalary, setMonthlySalary] = useState<string>(
    editTarget ? String(editTarget.monthly_salary) : ""
  );
  const [notes, setNotes] = useState<string>(editTarget?.notes ?? "");

  const create = useCreateManpowerExpense();
  const update = useUpdateManpowerExpense();
  const isPending = create.isPending || update.isPending;

  const handleSubmit = () => {
    if (!monthlySalary || (!editTarget && !technicianId)) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const payload = {
      technician: Number(technicianId),
      monthly_salary: parseFloat(monthlySalary),
      notes,
    };
    if (editTarget) {
      update.mutate(
        { id: editTarget.id, data: { monthly_salary: parseFloat(monthlySalary), notes } },
        {
          onSuccess: () => { toast({ title: "Updated", description: "Salary updated successfully." }); onClose(); },
          onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      create.mutate(payload as any, {
        onSuccess: () => { toast({ title: "Saved", description: "Salary record added." }); onClose(); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  // Selected technician display
  const selectedTech = technicians.find((t) => String(t.id) === technicianId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            {editTarget ? `Edit Salary — ${editTarget.technician_name}` : "Set Technician Salary"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Technician selector — hidden when editing */}
          {!editTarget && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Technician *
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {technicians.map((t) => {
                  const name = `${t.first_name} ${t.last_name}`.trim() || t.username;
                  const isSelected = String(t.id) === technicianId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTechnicianId(String(t.id))}
                      className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs border transition-colors text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "border-border/40 bg-background/50 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <UserAvatar name={name} size="sm" />
                      <span className="font-medium">{name}</span>
                      {isSelected && <span className="ml-auto text-[10px] font-bold text-primary">Selected</span>}
                    </button>
                  );
                })}
                {technicians.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/60 py-2 text-center">
                    No active technicians found. Add technicians in User Registry first.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Monthly salary */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Salary (₹) *
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="salary-amount"
                type="number"
                min={0}
                step={500}
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className="pl-8 h-9 text-xs"
                placeholder="e.g. 25000"
              />
            </div>
            {monthlySalary && !isNaN(parseFloat(monthlySalary)) && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Daily rate: <span className="font-semibold text-foreground ml-1">
                  ₹{(parseFloat(monthlySalary) / 30).toFixed(2)} / day
                </span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </label>
            <Input
              id="salary-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
              placeholder="e.g. Grade B2, includes HRA"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-sm text-xs border border-border/50 bg-background hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-salary-btn"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-8 px-4 rounded-sm text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {editTarget ? "Update Salary" : "Set Salary"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManpowerPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManpowerExpense | null>(null);

  const { data, isLoading } = useManpowerExpenses();
  const deleteRecord = useDeleteManpowerExpense();

  const records = data?.results ?? [];
  const totalMonthly = (data as any)?.total_monthly_payroll ?? 0;
  const totalDaily = (data as any)?.total_daily_cost ?? 0;

  const handleDelete = (record: ManpowerExpense) => {
    if (!confirm(`Remove salary record for ${record.technician_name}? This will stop including their cost in calculations.`)) return;
    deleteRecord.mutate(record.id, {
      onSuccess: () => toast({ title: "Removed", description: `${record.technician_name}'s salary record removed.` }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const openAdd = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (r: ManpowerExpense) => { setEditTarget(r); setDialogOpen(true); };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/40 shadow-sm">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Manpower</h1>
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0 h-5">{records.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set monthly salary per technician. Daily rate (÷30) is auto-included in cost-per-plantlet.
            </p>
          </div>
        </div>
        <button
          id="add-salary-btn"
          onClick={openAdd}
          className="h-9 px-4 rounded-sm text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2 font-medium shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Set Technician Salary
        </button>
      </div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          {
            label: "Total Monthly Payroll",
            value: fmt(totalMonthly),
            sub: "Sum of all active salaries",
            icon: <IndianRupee className="h-4 w-4" />,
            color: "text-emerald-500",
          },
          {
            label: "Daily Manpower Cost",
            value: `₹${Number(totalDaily).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
            sub: "Total monthly ÷ 30 days",
            icon: <CalendarDays className="h-4 w-4" />,
            color: "text-blue-500",
          },
          {
            label: "Technicians on Payroll",
            value: String(records.length),
            sub: "Active salary records",
            icon: <Users className="h-4 w-4" />,
            color: "text-violet-500",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 shadow-sm">
            <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-400">
        <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Salary costs are <strong>automatically included</strong> in the cost-per-plantlet calculation on the Expenses page.
          Formula: <code className="bg-blue-500/10 px-1 rounded">daily_rate × days_in_range</code> per technician.
          Update a salary record when a technician gets a raise — no monthly re-entry needed.
        </span>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Technician</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Monthly Salary</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Daily Rate</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Updated</TableHead>
                <TableHead className="w-20 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r, i) => (
                <TableRow key={r.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                  <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={r.technician_name} size="sm" />
                      <span className="text-xs font-semibold text-foreground">{r.technician_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-emerald-500">{fmt(Number(r.monthly_salary))}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground font-mono">
                      ₹{Number(r.daily_rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/day
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                    {r.notes || <span className="text-muted-foreground/30 italic">—</span>}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground font-mono">
                    {new Date(r.updated_at ?? r.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        id={`edit-salary-${r.id}`}
                        onClick={() => openEdit(r)}
                        title="Edit salary"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`remove-salary-${r.id}`}
                        onClick={() => handleDelete(r)}
                        disabled={deleteRecord.isPending}
                        title="Remove salary record"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                      >
                        {deleteRecord.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                      <Users className="h-8 w-8" />
                      <p className="text-xs">No salary records yet. Set a salary for each technician.</p>
                      <button onClick={openAdd} className="text-xs text-primary hover:underline mt-1">
                        + Set first technician salary
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {records.length > 0 && (
          <div className="border-t border-border/40 px-6 py-3 bg-muted/10 flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">{records.length} technician{records.length !== 1 ? "s" : ""} on payroll</span>
            <span className="text-xs font-bold text-foreground">
              Monthly Payroll: <span className="text-emerald-500 ml-1">{fmt(totalMonthly)}</span>
            </span>
          </div>
        )}
      </motion.div>

      <SalaryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
      />
    </div>
  );
}
