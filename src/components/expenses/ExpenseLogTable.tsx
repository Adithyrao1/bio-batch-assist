import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api";
import { useExpenses, useExpenseCategories, useCreateExpense, useCreateExpenseCategory, useDeleteExpense } from "@/hooks/useApiQueries";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, PieChart as PieChartIcon, Download, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Pagination } from "@/components/Pagination";

const COLORS = ['#2563eb', '#0ea5e9', '#0d9488', '#10b981', '#64748b', '#475569', '#3b82f6', '#1e293b'];

export function ExpenseLogTable({ isAdmin }: { isAdmin: boolean }) {
  const [page, setPage] = useState(1);
  const { data: expenses, isLoading: loadingExpenses } = useExpenses({ page_size: 1000 });
  const { data: categories } = useExpenseCategories();
  const createExpenseMutation = useCreateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const createCategoryMutation = useCreateExpenseCategory();
  const { toast } = useToast();

  const [isLogExpenseOpen, setIsLogExpenseOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");

  // Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const handleLogExpense = () => {
    if (!categoryId || !amount || !date) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    
    createExpenseMutation.mutate({
      category: parseInt(categoryId),
      amount: parseFloat(amount),
      date,
      description,
      invoice_reference: invoiceRef,
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Expense logged successfully." });
        setIsLogExpenseOpen(false);
        // Reset form
        setCategoryId(""); setAmount(""); setDescription(""); setInvoiceRef("");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to log expense.", variant: "destructive" });
      }
    });
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    createCategoryMutation.mutate({
      name: newCatName,
      description: newCatDesc,
    }, {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Category created successfully." });
        setIsAddCategoryOpen(false);
        setCategoryId(data.id.toString());
        setNewCatName(""); setNewCatDesc("");
      }
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let url = '/reports/expenses-excel/?';
      if (dateFrom) url += `start_date=${dateFrom}&`;
      if (dateTo) url += `end_date=${dateTo}&`;
      
      const triggerRes = await fetchWithAuth(url);
      if (!triggerRes.ok) throw new Error("Failed to initiate report generation");
      const triggerData = await triggerRes.json();
      const taskId = triggerData.task_id;

      let status = "PENDING";
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes
      while (status !== "SUCCESS" && status !== "FAILURE" && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        const statusRes = await fetchWithAuth(`/reports/check-status/${taskId}/`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          status = statusData.status;
        }
      }

      if (status !== "SUCCESS") {
        throw new Error("Report generation failed or timed out");
      }

      const downloadRes = await fetchWithAuth(`/reports/download/${taskId}/`);
      if (!downloadRes.ok) throw new Error("Failed to download the completed report");
      
      const blob = await downloadRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filenameDate = (dateFrom && dateTo) ? `${dateFrom}_to_${dateTo}` : (dateTo || dateFrom || "All");
      link.setAttribute('download', `Expense_Report_${filenameDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to download report', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  if (loadingExpenses) return <div className="text-xs text-muted-foreground p-4">Loading expenses...</div>;

  // Apply filters
  const filteredExpenses = expenses?.results.filter((exp: any) => {
    const matchesSearch = exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.invoice_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || exp.category?.toString() === filterCategory;
    const expDateStr = exp.date?.substring(0, 10);
    const matchesDateFrom = dateFrom ? expDateStr >= dateFrom : true;
    const matchesDateTo = dateTo ? expDateStr <= dateTo : true;
    
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  }) || [];

  const itemsPerPage = 10;
  const paginatedExpenses = filteredExpenses.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Aggregate expenses for the chart
  const expensesByCategory = filteredExpenses.reduce((acc: any, curr: any) => {
    const cat = curr.category_name || "Unknown";
    acc[cat] = (acc[cat] || 0) + Number(curr.amount);
    return acc;
  }, {});

  const chartData = Object.keys(expensesByCategory || {}).map((key) => ({
    name: key,
    value: expensesByCategory[key],
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-end mb-4 gap-4">
        <div className="flex flex-1 flex-wrap items-end gap-3 w-full">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search</label>
            <Input 
              placeholder="Invoice or description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                {categories?.results.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Range</label>
            <div className="flex items-center gap-1.5">
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                title="From Date"
                className="w-[130px] h-9 text-xs"
              />
              <span className="text-muted-foreground text-[10px] uppercase font-bold">to</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                title="To Date"
                className="w-[130px] h-9 text-xs"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 h-9">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel} 
            disabled={isExporting}
            className="h-9 text-xs gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Generating..." : "Export Excel"}
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setIsLogExpenseOpen(true)} className="h-9 text-xs bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="h-3.5 w-3.5" /> Log Expense
            </Button>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mb-6 rounded-md border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <PieChartIcon className="h-3.5 w-3.5 text-primary" />
            Cost Distribution by Category
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ fontSize: '11px', borderRadius: '4px' }}
                  formatter={(value: number) => `₹${value.toFixed(2)}`} 
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Inv / Ref #</TableHead>
              <TableHead className="text-xs">Recorded By</TableHead>
              <TableHead className="text-right text-xs">Amount</TableHead>
              {isAdmin && <TableHead className="w-[80px] text-xs"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExpenses.map((expense: any) => (
              <TableRow key={expense.id}>
                <TableCell className="text-xs font-medium">{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Receipt className="h-3 w-3" />
                    {expense.category_name}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={expense.description}>
                  {expense.description || "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{expense.invoice_reference || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{expense.recorded_by_name}</TableCell>
                <TableCell className="text-right font-bold text-xs text-blue-600 dark:text-blue-400">
                  ₹{Number(expense.amount).toFixed(2)}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this expense log? This will impact historical cost per plantlet calculations.")) {
                          deleteExpenseMutation.mutate(expense.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground text-xs">
                  No matching expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredExpenses.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filteredExpenses.length / itemsPerPage)}
            onPageChange={setPage}
            hasNext={page < Math.ceil(filteredExpenses.length / itemsPerPage)}
            hasPrevious={page > 1}
          />
        )}
      </div>

      {/* Log Expense Dialog */}
      <Dialog open={isLogExpenseOpen} onOpenChange={setIsLogExpenseOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Log Indirect Expense</DialogTitle>
            <DialogDescription className="text-xs">
              Record an invoice or receipt for overheads, apparatus, or consumables.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Category *</label>
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="flex-1 text-xs h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.results.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsAddCategoryOpen(true)} title="Add New Category">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Date *</label>
                <Input type="date" className="text-xs h-9" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Amount (₹) *</label>
                <Input type="number" className="text-xs h-9" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Invoice / Ref #</label>
                <Input className="text-xs h-9" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="e.g. INV-2026-05" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="What was this expense for?"
                className="resize-none h-20 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setIsLogExpenseOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleLogExpense} 
              size="sm"
              disabled={createExpenseMutation.isPending || !categoryId || !amount || !date}
              className="bg-primary hover:bg-primary/90 text-white text-xs h-9"
            >
              {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">New Expense Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Category Name *</label>
              <Input className="text-xs h-9" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Glassware" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Input className="text-xs h-9" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Optional details" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddCategory} 
              size="sm"
              disabled={createCategoryMutation.isPending || !newCatName}
              className="bg-primary hover:bg-primary/90 text-white text-xs h-9"
            >
              {createCategoryMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
