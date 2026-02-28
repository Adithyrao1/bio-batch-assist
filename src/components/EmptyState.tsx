import { FileX } from "lucide-react";

export function EmptyState({ message = "No records found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
      <FileX className="h-16 w-16 mb-4 opacity-30" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-1">Try adjusting your filters or add a new record.</p>
    </div>
  );
}
