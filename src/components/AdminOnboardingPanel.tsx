import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { CheckCircle, Clock, ShieldAlert, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export function AdminOnboardingPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-users'],
    queryFn: () => authApi.getPendingUsers(),
    refetchInterval: 10000, // Check for new users every 10s
  });

  const approveMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'technician' | 'admin' }) => 
      authApi.approveUser(userId, role),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve user');
    }
  });

  const pendingCount = data?.count || 0;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading || pendingCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" ref={panelRef}>
      
      {/* Popover Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-full max-w-md sm:w-[400px] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl"
            style={{ 
              background: isDark ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.95)",
              borderColor: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
            }}
          >
            <div className="flex items-center justify-between p-4 border-b bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-sm" style={{ color: isDark ? "#fff" : "#000" }}>
                  Pending Approvals
                </h3>
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {data?.pending_users.map(user => (
                <PendingUserCard 
                  key={user.id} 
                  user={user} 
                  onApprove={(role) => approveMutation.mutate({ userId: user.id, role })}
                  isApproving={approveMutation.isPending}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-14 w-14 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center text-white bg-gradient-to-br from-red-500 to-rose-600 transition-shadow hover:shadow-red-500/50"
      >
        <UserPlus className="h-6 w-6" />
        {/* Notification Badge */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 h-6 w-6 bg-white dark:bg-zinc-900 border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center text-[10px] font-bold"
        >
          {pendingCount}
        </motion.div>
      </motion.button>
    </div>
  );
}

function PendingUserCard({ 
  user, 
  onApprove, 
  isApproving 
}: { 
  user: any; 
  onApprove: (role: 'technician' | 'admin') => void;
  isApproving: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<'technician' | 'admin'>('technician');

  return (
    <div className="flex flex-col p-3 rounded-xl border bg-card/50 gap-3 text-sm shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
          {user.first_name?.[0] || user.username[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {user.date_joined}</span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <select 
          className="flex-1 text-xs bg-background border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/50"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as any)}
        >
          <option value="technician">Lab Technician</option>
          <option value="admin">Admin / Manager</option>
        </select>
        
        <button
          onClick={() => onApprove(selectedRole)}
          disabled={isApproving}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Approve
        </button>
      </div>
    </div>
  );
}
