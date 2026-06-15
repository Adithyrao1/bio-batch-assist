import { useState } from "react";
import { useUsers, useDeleteUser, useUpdateUserRole } from "@/hooks/useApiQueries";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Pencil, UserX, Loader2, Users, Search, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

// ── Edit Role Dialog ──────────────────────────────────────────────────────────
function EditRoleDialog({
  user,
  open,
  onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const updateRole = useUpdateUserRole();
  const [role, setRole] = useState(user?.role ?? "viewer");
  const [userStatus, setUserStatus] = useState(user?.status ?? "active");

  // Sync state when user changes
  if (user && role !== user.role && !updateRole.isPending) {
    setRole(user.role);
    setUserStatus(user.status);
  }

  const handleSave = () => {
    if (!user) return;
    updateRole.mutate(
      { id: user.id, data: { role, status: userStatus } },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: `${user.email} role updated to ${role}.` });
          onClose();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Edit Role & Status</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-5 py-2">
            {/* User info strip */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <UserAvatar name={`${user.first_name} ${user.last_name}`.trim() || user.username} profilePicture={user.profile_picture} size="sm" />
              <div>
                <p className="text-xs font-semibold text-foreground">{`${user.first_name} ${user.last_name}`.trim() || user.username}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                System Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role-select" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" className="text-xs">Admin — Full system access</SelectItem>
                  <SelectItem value="technician" className="text-xs">Technician — Data entry & stock</SelectItem>
                  <SelectItem value="viewer" className="text-xs">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Account Status
              </label>
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger id="status-select" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-sm text-xs border border-border/50 bg-background hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-role-btn"
            onClick={handleSave}
            disabled={updateRole.isPending}
            className="h-8 px-4 rounded-sm text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {updateRole.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<User | null>(null);

  const params: Record<string, string> = {};
  if (roleFilter !== "all") params.role = roleFilter;
  if (statusFilter !== "all") params.status = statusFilter;
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useUsers(params);
  const deleteUser = useDeleteUser();

  const users = data?.results ?? [];

  const handleDeactivate = (user: User) => {
    if (confirm(`Deactivate ${user.username}? They will no longer be able to log in.`)) {
      deleteUser.mutate(user.id, {
        onSuccess: () => toast({ title: "Deactivated", description: `${user.email} has been deactivated.` }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 border border-border/40 text-muted-foreground shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">User Registry</h1>
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0 h-5">
                {users.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage access permissions, edit roles, and track login activity.
            </p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="user-search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger id="role-filter" className="h-8 text-xs w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Roles</SelectItem>
            <SelectItem value="admin" className="text-xs">Admin</SelectItem>
            <SelectItem value="technician" className="text-xs">Technician</SelectItem>
            <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" className="h-8 text-xs w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Member</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last Login</span>
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                <TableHead className="w-20 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, i) => {
                const fullName = `${u.first_name} ${u.last_name}`.trim() || u.username;
                return (
                  <TableRow key={u.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-muted-foreground text-xs font-mono">{String(i + 1).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={fullName} profilePicture={u.profile_picture} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </TableCell>
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
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {(u as any).last_login ?? <span className="text-muted-foreground/40">Never</span>}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {(u as any).date_joined ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          id={`edit-user-${u.id}`}
                          onClick={() => setEditTarget(u)}
                          title="Edit role & status"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border/40 bg-background/50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`deactivate-user-${u.id}`}
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
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    No users found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Role Dialog */}
      <EditRoleDialog
        user={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}
