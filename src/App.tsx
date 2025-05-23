import { lazy, Suspense } from "react";
import Login from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Route, Routes, Outlet, Navigate } from "react-router";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthProvider";
import { AuthGuard } from "./components/AuthGuard";
import { useAuth } from "./hooks/useAuth";
import { ActiveGroupProvider } from "./contexts/ActiveGroupContext";
import { WalletMinimal } from "lucide-react";

// Lazy load components with named exports and better chunking
const Home = lazy(() =>
  import("./Home").then((module) => ({ default: module.default }))
);
const Transactions = lazy(() =>
  import("./pages/Transactions/Transactions").then((module) => ({
    default: module.Transactions,
  }))
);
const TransactionsCategorization = lazy(() =>
  import("./pages/TransactionsCategorization").then((module) => ({
    default: module.TransactionsCategorization,
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

function AppContent() {
  const { user } = useAuth();

  if (user === undefined) {
    return null;
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
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-screen">
                      <WalletMinimal className="w-40 h-40 text-muted" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </AuthGuard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route
          path="/transactions/categorization"
          element={<TransactionsCategorization />}
        />
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
