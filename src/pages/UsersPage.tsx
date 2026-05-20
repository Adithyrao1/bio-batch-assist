import { useUsers, useDeleteUser } from "@/hooks/useApiQueries";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, UserX, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/UserAvatar";
import type { User } from "@/types/api";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  technician: "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  viewer: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  inactive: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

export default function UsersPage() {
  const { toast } = useToast();
  const { data, isLoading } = useUsers();
  const deleteUser = useDeleteUser();

  const handleDeactivate = (user: User) => {
    if (confirm(`Are you sure you want to deactivate or delete user ${user.username}?`)) {
      deleteUser.mutate(user.id, {
        onSuccess: () => toast({ title: "Deleted", description: "User account deleted successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const users = data?.results ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header section matching LIMS layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/40 text-muted-foreground shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                User Registry
              </h1>
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0 h-5">
                {users.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage system access permissions, review technician accounts, and monitor user statuses.
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
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
                <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Member</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, i) => {
                const fullName = `${u.first_name} ${u.last_name}`.trim() || u.username;
                const displayName = fullName === "Dr. Sarah Chen" ? "Vineeta Raina" : fullName;

                return (
                  <TableRow key={u.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={displayName} profilePicture={u.profile_picture} size="sm" />
                        <span className="text-xs font-semibold text-foreground">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">@{u.username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize text-[10px] font-semibold border ${ROLE_BADGE[u.role] ?? ROLE_BADGE.viewer}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize text-[10px] font-semibold border ${STATUS_BADGE[u.status] ?? STATUS_BADGE.inactive}`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => toast({ title: "Edit User", description: "Form dialog coming soon." })}
                          title="Edit staff details"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(u)}
                          disabled={deleteUser.isPending}
                          title="Deactivate account"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border/40 bg-background/50 disabled:opacity-40"
                        >
                          {deleteUser.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No registered system users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>

    </div>
  );
}
