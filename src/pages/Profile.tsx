import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Mail, ShieldCheck, CheckCircle2,
  User, BadgeCheck, Camera, Loader2,
  CheckCircle, Info, Pencil, Save, X
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";

export default function Profile() {
  const { user } = useAuth();
  // Raw API user has first_name/last_name; AuthContext.User collapses them to 'name'
  const storedUser = authApi.getStoredUser();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    username: storedUser?.username ?? user?.username ?? "",
    first_name: storedUser?.first_name ?? "",
    last_name: storedUser?.last_name ?? "",
  });

  if (!user) return null;

  const displayName = user.name || user.username;

  const handleEdit = () => {
    setForm({
      username: storedUser?.username ?? user.username,
      first_name: storedUser?.first_name ?? "",
      last_name: storedUser?.last_name ?? "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await authApi.patchProfile(form);
      authApi.setStoredUser({ ...user, ...updated } as any);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      // Reload to reflect updated name in sidebar/topbar
      setTimeout(() => window.location.reload(), 800);
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    try {
      setIsUploading(true);
      const updatedUser = await authApi.uploadProfilePicture(file);
      authApi.setStoredUser(updatedUser as any);
      toast.success("Profile picture updated!");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getPermissions = (role: string) => {
    switch (role) {
      case "admin": return [
        "Full system configuration and master data management",
        "Technician user provisioning and access control",
        "Chemical inventory override and batch deletions",
        "System automation task triggering (Celery digests)",
        "Read and write access across all operational logs",
        "Full expense and costing dashboard access",
      ];
      case "technician": return [
        "Data entry across all production line stages",
        "Stock solution preparation and raw chemical deduction",
        "Chemical inventory stock adjustments",
        "Access to read operational dashboard analytics",
        "Read-only access to master data tables",
      ];
      default: return [
        "Read-only access to production pipelines",
        "Read-only access to chemical stock levels",
        "Read-only access to cost calculations",
        "Access to voice commands and AI Assistant",
      ];
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">User Profile</h1>
          <p className="text-xs text-muted-foreground mt-1">
            View and edit your personal details, role permissions, and account status.
          </p>
        </div>
        {/* Edit / Save / Cancel controls */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                id="cancel-profile-edit"
                onClick={handleCancel}
                className="h-8 px-3 rounded-sm text-xs border border-border/50 bg-background hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                id="save-profile-btn"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 px-3 rounded-sm text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </>
          ) : (
            <button
              id="edit-profile-btn"
              onClick={handleEdit}
              className="h-8 px-3 rounded-sm text-xs border border-border/50 bg-background hover:bg-muted transition-colors inline-flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Avatar card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:col-span-1 space-y-6"
        >
          <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm p-6 flex flex-col items-center text-center">
            <div
              className="relative cursor-pointer group mb-4"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <UserAvatar name={displayName} profilePicture={user.profile_picture} size="lg" />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">Click avatar to change photo</p>

            <h2 className="text-base font-bold text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>

            <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user.role}
            </div>

            <div className="w-full border-t border-border/40 mt-6 pt-4 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Account Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right: Detail fields */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="md:col-span-2 space-y-6"
        >
          {/* Account Details card */}
          <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Details</span>
              {isEditing && (
                <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/20">
                  Editing
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* First Name + Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> First Name
                  </p>
                  {isEditing ? (
                    <Input
                      id="input-first-name"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="h-9 text-xs"
                      placeholder="First name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-9 px-3 rounded-sm bg-muted/40 border border-border/50">
                      <span className="text-xs font-medium text-foreground">{storedUser?.first_name || "—"}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Last Name
                  </p>
                  {isEditing ? (
                    <Input
                      id="input-last-name"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="h-9 text-xs"
                      placeholder="Last name"
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-9 px-3 rounded-sm bg-muted/40 border border-border/50">
                      <span className="text-xs font-medium text-foreground">{storedUser?.last_name || "—"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> Username
                </p>
                {isEditing ? (
                  <Input
                    id="input-username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="h-9 text-xs font-mono"
                    placeholder="username"
                  />
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-sm bg-muted/40 border border-border/50">
                    <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground font-mono">@{user.username}</span>
                  </div>
                )}
              </div>

              {/* Email — always read-only */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</p>
                <div className="flex items-center gap-2 h-9 px-3 rounded-sm bg-muted/40 border border-border/50">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground flex-1">{user.email}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified via SSO
                  </span>
                </div>
                {isEditing && (
                  <p className="text-[10px] text-muted-foreground/60 italic">
                    Email is managed via Azure SSO and cannot be changed here.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Permissions card */}
          <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Permissions</span>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-sm text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Managed via Entra ID
              </span>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {getPermissions(user.role).map((permission, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground/80 leading-normal">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
