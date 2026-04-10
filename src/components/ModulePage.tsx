import { ReactNode, useState } from "react";
import { Plus, Search, Download, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface ModulePageProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onAddNew?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  renderForm?: (onClose: () => void) => ReactNode;
  hideViewAction?: boolean;
}

export function ModulePage<T extends { id: string | number }>({
  title,
  data,
  columns,
  isLoading = false,
  isError = false,
  onRetry,
  onAddNew,
  onEdit,
  onDelete,
  hideViewAction = false,
}: ModulePageProps<T>) {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<T | null>(null);
  const { hasPermission } = useAuth();

  const filtered = data.filter((item) =>
    columns.some((col) => {
      const val = (item as Record<string, unknown>)[col.key];
      return String(val ?? "").toLowerCase().includes(search.toLowerCase());
    })
  );

  const exportCSV = () => {
    const headers = columns.map((c) => c.header).join(",");
    const rows = filtered.map((item) =>
      columns.map((col) => `"${String((item as Record<string, unknown>)[col.key] ?? "")}"`).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          {hasPermission("create") && (
            <Button size="sm" onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="font-semibold text-foreground">Failed to load data</p>
            <p className="text-sm text-muted-foreground max-w-xs">Could not connect to the server. Check your connection or make sure the backend is running.</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.header}</TableHead>
                ))}
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      {!hideViewAction && (
                        <Button variant="ghost" size="sm" onClick={() => setViewItem(item)}>
                          View
                        </Button>
                      )}
                      {hasPermission("edit") && onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                          Edit
                        </Button>
                      )}
                      {hasPermission("delete") && onDelete && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(item)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>View Record Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  {viewItem && Object.entries(viewItem).map(([key, value]) => {
                      if (key === 'id') return null; // usually skip raw ID
                      
                      const formatKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      
                      let displayValue = String(value);
                      if (value === null || value === undefined) displayValue = "N/A";
                      else if (typeof value === 'boolean') displayValue = value ? "Yes" : "No";
                      else if (Array.isArray(value)) displayValue = value.join(', ');

                      return (
                          <div key={key} className="flex flex-col mb-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{formatKey}</span>
                              <span className="text-foreground">{displayValue}</span>
                          </div>
                      );
                  })}
              </div>
          </DialogContent>
      </Dialog>

    </motion.div>
  );
}
