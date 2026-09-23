import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FieldSidebar } from "./FieldSidebar";
import { TopBar } from "./TopBar";

export function FieldLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FieldSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar moduleName="FieldLink Tracker" />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
