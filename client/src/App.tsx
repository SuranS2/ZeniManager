/**
 * App.tsx - 라우팅 및 레이아웃 설정
 * Design: 모던 웰니스 미니멀리즘
 * Primary: #009C64 | Background: #F0EEE9 | Font: Noto Sans KR
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { isAdminRole } from "@shared/const";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import CounselorDashboard from "./pages/counselor/Dashboard";
import ClientList from "./pages/counselor/ClientList";
import ClientRegister from "./pages/counselor/ClientRegister";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CounselorList from "./pages/admin/CounselorList";
import AdminClientList from "./pages/admin/AdminClientList";

// Protected route wrapper
function ProtectedRoute({ component: Component, adminOnly = false }: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdminRole(user?.role)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

// Counselor-only route
function CounselorRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (isAdminRole(user?.role)) return <Redirect to="/admin/dashboard" />;

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}
function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={Login} />

      {/* Root redirect */}
      <Route path="/">
        {isAuthenticated
          ? <Redirect to={isAdminRole(user?.role) ? '/admin/dashboard' : '/dashboard'} />
          : <Redirect to="/login" />
        }
      </Route>

      {/* Counselor routes */}
      <Route path="/dashboard">
        <CounselorRoute component={CounselorDashboard} />
      </Route>
      <Route path="/dashboard/:sub">
        <CounselorRoute component={CounselorDashboard} />
      </Route>
      <Route path="/clients">
        <CounselorRoute component={ClientList} />
      </Route>
      <Route path="/clients/list">
        <CounselorRoute component={ClientList} />
      </Route>
      <Route path="/clients/register">
        <CounselorRoute component={ClientRegister} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/admin/dashboard/:sub">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/admin/counselors">
        <ProtectedRoute component={CounselorList} adminOnly />
      </Route>
      <Route path="/admin/clients">
        <ProtectedRoute component={AdminClientList} adminOnly />
      </Route>

      {/* Settings */}
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* Fallback */}
      <Route>
        {isAuthenticated
          ? <Redirect to={isAdminRole(user?.role) ? '/admin/dashboard' : '/dashboard'} />
          : <Redirect to="/login" />
        }
      </Route>
    </Switch>
  );
}

function App() {
  const isPackagedElectron = typeof window !== "undefined" && window.location.protocol === "file:";

  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <WouterRouter hook={isPackagedElectron ? useHashLocation : undefined}>
          <TooltipProvider>
            <Toaster position="top-right" />
            <AppRoutes />
          </TooltipProvider>
        </WouterRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
