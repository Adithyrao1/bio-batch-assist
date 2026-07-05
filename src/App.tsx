import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { FieldLayout } from "@/components/layout/FieldLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Launchpad from "./pages/Launchpad";
import PendingApproval from "./pages/PendingApproval";
import FieldDashboard from "./pages/FieldDashboard";
import SeedLotsPage from "./pages/SeedLotsPage";
import FarmersPage from "./pages/FarmersPage";
import GenealogyView from "./pages/GenealogyView";
import PlotMapView from "./pages/PlotMapView";

import Dashboard from "./pages/Dashboard";
import DailyProduction from "./pages/DailyProduction";
import Chemicals from "./pages/Chemicals";
import MasterData from "./pages/MasterData";
import UsersPage from "./pages/UsersPage";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";
import AIAssistant from "./pages/AIAssistant";

import Profile from "./pages/Profile";
import ManpowerPage from "./pages/ManpowerPage";

const queryClient = new QueryClient();

type LayoutType = "lab" | "field" | "none";

function ProtectedRoute({ children, adminOnly = false, blockTechnician = false, layout = "lab" }: { children: React.ReactNode; adminOnly?: boolean; blockTechnician?: boolean; layout?: LayoutType }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Redirect non-onboarded users to role selection
  if (!user.is_onboarded) return <Navigate to="/select-role" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/launchpad" replace />;
  if (blockTechnician && user.role === "technician") return <Navigate to="/launchpad" replace />;
  if (layout === "none") return <>{children}</>;
  if (layout === "field") return <FieldLayout>{children}</FieldLayout>;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) {
    // If logged in but not onboarded, send to role selection
    if (!user.is_onboarded) return <Navigate to="/select-role" replace />;
    return <Navigate to="/launchpad" replace />;
  }
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // If already onboarded, skip to launchpad
  if (user.is_onboarded) return <Navigate to="/launchpad" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="labnest-theme" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/select-role" element={<OnboardingRoute><PendingApproval /></OnboardingRoute>} />

              <Route path="/launchpad" element={<ProtectedRoute layout="none"><Launchpad /></ProtectedRoute>} />

              {/* FieldLink Module Routes */}
              <Route path="/field" element={<ProtectedRoute layout="field" blockTechnician><FieldDashboard /></ProtectedRoute>} />
              <Route path="/field/lots" element={<ProtectedRoute layout="field" blockTechnician><SeedLotsPage /></ProtectedRoute>} />
              <Route path="/field/farmers" element={<ProtectedRoute layout="field" blockTechnician><FarmersPage /></ProtectedRoute>} />
              <Route path="/field/genealogy" element={<ProtectedRoute layout="field" blockTechnician><GenealogyView /></ProtectedRoute>} />
              <Route path="/field/map" element={<ProtectedRoute layout="field" blockTechnician><PlotMapView /></ProtectedRoute>} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/daily-production" element={<ProtectedRoute><DailyProduction /></ProtectedRoute>} />

              <Route path="/chemicals" element={<ProtectedRoute><Chemicals /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/master-data" element={<ProtectedRoute adminOnly><MasterData /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
              <Route path="/manpower" element={<ProtectedRoute adminOnly><ManpowerPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/ai-assistant" element={<ProtectedRoute layout="none"><AIAssistant /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
