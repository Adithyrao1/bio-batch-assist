import { ReactNode, useState } from "react";
import { Plus, Search, Download, Loader2 } from "lucide-react";
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
  onAddNew?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  renderForm?: (onClose: () => void) => ReactNode;
}

export function ModulePage<T extends { id: string | number }>({
  title,
  data,
  columns,
  isLoading = false,
  onAddNew,
  onView,
  onEdit,
  onDelete,
}: ModulePageProps<T>) {
  const [search, setSearch] = useState("");
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
                      {onView && (
                        <Button variant="ghost" size="sm" onClick={() => onView(item)}>
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
    </motion.div>
  );
}
