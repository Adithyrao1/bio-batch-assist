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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, IndianRupee, Loader2, Plus, Pencil, Trash2, CalendarDays, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import type { ManpowerExpense } from "@/types/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  { value: 1,  label: "January" },  { value: 2,  label: "February" },
  { value: 3,  label: "March" },    { value: 4,  label: "April" },
  { value: 5,  label: "May" },      { value: 6,  label: "June" },
  { value: 7,  label: "July" },     { value: 8,  label: "August" },
  { value: 9,  label: "September" },{ value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - 1 + i);

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────
function SalaryDialog({
  open,
  onClose,
  editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: ManpowerExpense | null;
}) {
  const { toast } = useToast();
  const { data: usersData } = useUsers({ role: "technician", status: "active" });
  const technicians = usersData?.results ?? [];

  const now = new Date();
  const [technicianId, setTechnicianId] = useState<string>(editTarget ? String(editTarget.technician) : "");
  const [month, setMonth] = useState<string>(editTarget ? String(editTarget.month) : String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(editTarget ? String(editTarget.year) : String(CURRENT_YEAR));
  const [amount, setAmount] = useState<string>(editTarget ? String(editTarget.amount) : "");
  const [notes, setNotes] = useState<string>(editTarget?.notes ?? "");

  const create = useCreateManpowerExpense();
  const update = useUpdateManpowerExpense();
  const isPending = create.isPending || update.isPending;

  const handleSubmit = () => {
    if (!technicianId || !amount || !month || !year) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const payload = {
      technician: Number(technicianId),
      month: Number(month),
      year: Number(year),
      amount: parseFloat(amount),
      notes,
    };

    if (editTarget) {
      update.mutate(
        { id: editTarget.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Updated", description: "Salary record updated." }); onClose(); },
          onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast({ title: "Saved", description: "Salary record added successfully." }); onClose(); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            {editTarget ? "Edit Salary Record" : "Add Salary Record"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Technician */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Technician *</label>
            <Select value={technicianId} onValueChange={setTechnicianId} disabled={!!editTarget}>
              <SelectTrigger id="salary-technician" className="h-9 text-xs">
                <SelectValue placeholder="Select technician…" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                    {`${t.first_name} ${t.last_name}`.trim() || t.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editTarget && (
              <p className="text-[10px] text-muted-foreground/60 italic">Technician cannot be changed. Delete and re-add if needed.</p>
            )}
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Month *</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="salary-month" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Year *</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="salary-year" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Salary Amount (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="salary-amount"
                type="number"
                min={0}
                step={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-9 text-xs"
                placeholder="e.g. 25000"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
            <Input
              id="salary-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
              placeholder="e.g. Includes overtime allowance"
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
            {editTarget ? "Update Record" : "Add Record"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManpowerPage() {
  const { toast } = useToast();
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR));
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManpowerExpense | null>(null);

  const params: Record<string, string | number> = { year: filterYear };
  if (filterMonth !== "all") params.month = filterMonth;

  const { data, isLoading } = useManpowerExpenses(params);
  const deleteRecord = useDeleteManpowerExpense();

  const records = data?.results ?? [];
  const totalAmount = data?.total_amount ?? 0;

  // Stats
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthTotal = records
    .filter((r) => r.month === currentMonth && r.year === CURRENT_YEAR)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const uniqueTechs = new Set(records.map((r) => r.technician)).size;

  const handleDelete = (record: ManpowerExpense) => {
    if (!confirm(`Delete salary record for ${record.technician_name} (${record.month_display} ${record.year})?`)) return;
    deleteRecord.mutate(record.id, {
      onSuccess: () => toast({ title: "Deleted", description: "Salary record removed." }),
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
              <h1 className="text-xl font-bold tracking-tight text-foreground">Manpower Expenses</h1>
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0 h-5">{records.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track monthly technician salaries. Included in cost-per-plantlet calculation (pro-rated).
            </p>
          </div>
        </div>
        <button
          id="add-salary-btn"
          onClick={openAdd}
          className="h-9 px-4 rounded-sm text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2 font-medium shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add Salary Record
        </button>
      </div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          {
            label: "This Month Total",
            value: fmt(thisMonthTotal),
            sub: MONTHS.find((m) => m.value === currentMonth)?.label + " " + CURRENT_YEAR,
            icon: <IndianRupee className="h-4 w-4" />,
            color: "text-emerald-500",
          },
          {
            label: "Filtered Period Total",
            value: fmt(totalAmount),
            sub: `${filterMonth === "all" ? "All months" : MONTHS.find((m) => String(m.value) === filterMonth)?.label}, ${filterYear}`,
            icon: <TrendingUp className="h-4 w-4" />,
            color: "text-blue-500",
          },
          {
            label: "Technicians Tracked",
            value: String(uniqueTechs),
            sub: "Active in selected period",
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <CalendarDays className="h-3.5 w-3.5" /> Filter by:
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger id="filter-year" className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger id="filter-month" className="h-8 text-xs w-40">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Months</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Period</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Salary Amount</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorded By</TableHead>
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
                  <TableCell>
                    <span className="text-xs text-foreground font-medium">{r.month_display} {r.year}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-emerald-500">{fmt(Number(r.amount))}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                    {r.notes || <span className="text-muted-foreground/30 italic">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.recorded_by_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        id={`edit-salary-${r.id}`}
                        onClick={() => openEdit(r)}
                        title="Edit"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-salary-${r.id}`}
                        onClick={() => handleDelete(r)}
                        disabled={deleteRecord.isPending}
                        title="Delete"
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
                      <p className="text-xs">No salary records found for the selected period.</p>
                      <button onClick={openAdd} className="text-xs text-primary hover:underline mt-1">+ Add the first record</button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* Footer total row */}
        {records.length > 0 && (
          <div className="border-t border-border/40 px-6 py-3 bg-muted/10 flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">{records.length} record{records.length !== 1 ? "s" : ""}</span>
            <span className="text-xs font-bold text-foreground">
              Total: <span className="text-emerald-500 ml-1">{fmt(totalAmount)}</span>
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
