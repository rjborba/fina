import Login from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Transactions } from "./Transactions";
import { Route, Routes, Outlet, Navigate } from "react-router";
import { Toaster } from "./components/ui/toaster";
import Home from "./Home";
import { AuthProvider } from "./contexts/AuthProvider";
import { AuthGuard } from "./components/AuthGuard";
import { useAuth } from "./hooks/useAuth";
import { ActiveGroupProvider } from "./contexts/ActiveGroupContext";
import { Accounts } from "./pages/Accounts/Accounts";
import { Categories } from "./pages/Categories/Categories";
import { Import } from "./pages/Imports/Import";
import { Settings } from "./pages/Settings/Settings";

function AppContent() {
  const { user } = useAuth();

  if (user === undefined) {
    return <div>Loading...</div>;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <AuthGuard>
            <div className="flex">
              <Sidebar />
              <div className="flex-1">
                <Outlet />
              </div>
            </div>
          </AuthGuard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/bank-accounts" element={<Accounts />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/imports" element={<Import />} />
        <Route path="/group-settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ActiveGroupProvider>
        <AppContent />
        <Toaster />
      </ActiveGroupProvider>
    </AuthProvider>
  );
}

export default App;
