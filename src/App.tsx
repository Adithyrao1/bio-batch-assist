import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ContaminationMonitoring from "./pages/ContaminationMonitoring";
import MediaPreparation from "./pages/MediaPreparation";
import GrowthRoom from "./pages/GrowthRoom";
import InoculationRoom from "./pages/InoculationRoom";
import Chemicals from "./pages/Chemicals";
import ContaminationReports from "./pages/ContaminationReports";
import Greenhouse from "./pages/Greenhouse";
import MasterData from "./pages/MasterData";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/contamination-monitoring" element={<ProtectedRoute><ContaminationMonitoring /></ProtectedRoute>} />
            <Route path="/media-preparation" element={<ProtectedRoute><MediaPreparation /></ProtectedRoute>} />
            <Route path="/growth-room" element={<ProtectedRoute><GrowthRoom /></ProtectedRoute>} />
            <Route path="/inoculation-room" element={<ProtectedRoute><InoculationRoom /></ProtectedRoute>} />
            <Route path="/chemicals" element={<ProtectedRoute><Chemicals /></ProtectedRoute>} />
            <Route path="/contamination-reports" element={<ProtectedRoute><ContaminationReports /></ProtectedRoute>} />
            <Route path="/greenhouse" element={<ProtectedRoute><Greenhouse /></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute adminOnly><MasterData /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
