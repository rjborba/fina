import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  Home,
  List,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Banknote,
  Tag,
  Import,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfile } from "./UserProfile";
import { Avatar, AvatarFallback } from "./ui/avatar";
import useLocalStorageState from "@/hooks/useLocalStorageState";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  subItems?: NavigationItem[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: <Home className="size-4" /> },
  {
    path: "/transactions",
    label: "Transactions",
    icon: <List className="size-4" />,
    // subItems: [
    //   {
    //     path: "/transactions/categorization",
    //     label: "Categorization",
    //     icon: <Tag className="size-4" />,
    //   },
    // ],
  },
  {
    path: "/bank-accounts",
    label: "Bank Accounts",
    icon: <Banknote className="size-4" />,
  },
  {
    path: "/categories",
    label: "Categories",
    icon: <Tag className="size-4" />,
  },
  {
    path: "/imports",
    label: "Imports",
    icon: <Import className="size-4" />,
  },
  {
    path: "/group-settings",
    label: "Group Settings",
    icon: <Settings className="size-4" />,
  },
];

const getGroupInitials = (name: string | null | undefined) => {
  if (!name) return "";
  return name
    .toUpperCase()
    .split(" ")
    .filter((word) => word !== "E" && word !== "AND")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");
};

export function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState(
    "isSidebarCollapsed",
    false
  );
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { selectedGroup, groups, setSelectedGroup } = useActiveGroup();

  const navigationItems = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        ...item,
        isActive: location.pathname === item.path,
        subItems: item.subItems?.map((subItem) => ({
          ...subItem,
          isActive: location.pathname === subItem.path,
        })),
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
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild value={selectedGroup?.id}>
            <div>
              <Button
                variant="ghost"
                size="icon"
                className="w-full flex gap-2 justify-start items-center"
              >
                <div className="flex-1 flex gap-2 items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getGroupInitials(selectedGroup?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn({
                      "text-sm font-medium truncate": true,
                      hidden: isSidebarCollapsed,
                    })}
                  >
                    {selectedGroup?.name}
                  </div>
                </div>
                {!isSidebarCollapsed && (
                  <div className="p-2">
                    <ChevronDown className="size-4" />
                  </div>
                )}
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                }}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs">
                    {getGroupInitials(group?.name)}
                  </AvatarFallback>
                </Avatar>
                {group?.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map(({ path, label, icon, isActive, subItems }) => (
          <div key={path} className="space-y-1">
            <Button
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
            {subItems && (
              <div
                className={cn(
                  "space-y-1",
                  isSidebarCollapsed ? "ml-1" : "ml-6"
                )}
              >
                {subItems.map((subItem) => (
                  <Button
                    key={subItem.path}
                    variant={subItem.isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isSidebarCollapsed && "justify-center",
                      subItem.isActive && "bg-muted hover:bg-muted"
                    )}
                    asChild
                  >
                    <Link to={subItem.path} className="flex items-center">
                      {isSidebarCollapsed ? (
                        <div className="relative">{subItem.icon}</div>
                      ) : (
                        <>
                          {subItem.icon}
                          <span className="ml-2">{subItem.label}</span>
                        </>
                      )}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
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
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
