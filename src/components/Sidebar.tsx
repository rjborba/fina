import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Home, List, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfile } from "./UserProfile";

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
];

export function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const navigationItems = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        ...item,
        isActive: location.pathname === item.path,
      })),
    [location.pathname]
  );

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r bg-background transition-all duration-300 sticky top-0",
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
      <div className="border-t p-2 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            {user && (
              <UserProfile
                user={user}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
