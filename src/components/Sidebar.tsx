import { Link, useLocation } from "react-router";
import { Button } from "./ui/button";
import {
  Home,
  List,
  Import,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  {
    path: "/transactions",
    label: "Transactions",
    icon: <List className="h-4 w-4" />,
  },
  { path: "/import", label: "Import", icon: <Import className="h-4 w-4" /> },
  {
    path: "/settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const location = useLocation();

  const navigationItems = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        ...item,
        isActive: location.pathname === item.path,
      })),
    [location.pathname]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r bg-background transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4 justify-between">
        {!isSidebarCollapsed && <h1 className="font-semibold">Fina</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map(({ path, label, icon, isActive }) => (
          <Button
            key={path}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isSidebarCollapsed && "justify-center",
              isActive && "bg-muted hover:bg-muted"
            )}
            asChild
          >
            <Link to={path} className="flex items-center">
              {icon}
              {!isSidebarCollapsed && <span className="ml-2">{label}</span>}
            </Link>
          </Button>
        ))}
      </nav>
    </div>
  );
}
