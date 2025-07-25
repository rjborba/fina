import { lazy, Suspense, useEffect } from "react";
import Login from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Route, Routes, Outlet, Navigate } from "react-router";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthProvider";
import { AuthGuard } from "./components/AuthGuard";
import { useAuth } from "./hooks/useAuth";
import { ActiveGroupProvider } from "./contexts/ActiveGroupContext";
import { WalletMinimal } from "lucide-react";
import useLocalStorageState from "./hooks/useLocalStorageState";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import Invites from "./pages/Invites/Invites";

// Lazy load components with named exports and better chunking
const Home = lazy(() =>
  import("./Home").then((module) => ({ default: module.default }))
);
const Transactions = lazy(() =>
  import("./pages/Transactions/Transactions").then((module) => ({
    default: module.Transactions,
  }))
);
const Accounts = lazy(() =>
  import("./pages/Accounts/Accounts").then((module) => ({
    default: module.Accounts,
  }))
);
const Categories = lazy(() =>
  import("./pages/Categories/Categories").then((module) => ({
    default: module.Categories,
  }))
);
const Import = lazy(() =>
  import("./pages/Imports/Import").then((module) => ({
    default: module.Import,
  }))
);
const Settings = lazy(() =>
  import("./pages/Settings/Settings").then((module) => ({
    default: module.Settings,
  }))
);
const GroupDetails = lazy(() =>
  import("./pages/Groups/GroupDetails/GroupDetails").then((module) => ({
    default: module.GroupDetails,
  }))
);

function AppContent() {
  const { user } = useAuth();
  const [isDarkMode] = useLocalStorageState("theme-dark", false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  if (user === undefined) {
    return null;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <AuthGuard>
            <SidebarProvider>
              <Sidebar />
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <main className="flex-1">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-screen">
                      <WalletMinimal className="w-40 h-40 text-muted" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </main>
            </SidebarProvider>
          </AuthGuard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/bank-accounts" element={<Accounts />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/imports" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/group-details/:groupId" element={<GroupDetails />} />
        <Route path="/invites" element={<Invites />} />
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
