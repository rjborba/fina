import Login from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Transactions } from "./Transactions";
import { Route, Routes, Outlet } from "react-router";
import { Toaster } from "./components/ui/toaster";
import Home from "./Home";
import { AuthProvider } from "./contexts/AuthProvider";
import { AuthGuard } from "./components/AuthGuard";

function AppContent() {
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
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
