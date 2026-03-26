import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

export function TopBar() {
  const { user, logout } = useAuth();

  const roleBadgeVariant = user?.role === "admin" ? "default" : user?.role === "technician" ? "secondary" : "outline";

  return (
    <header className="h-14 border-b border-border/50 bg-background/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.name == "Dr. Sarah Chen" ? "Vineeta Raina" : user.name}</span>
            <Badge variant={roleBadgeVariant} className="capitalize text-xs">
              {user.role}
            </Badge>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
