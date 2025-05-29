import { Banknote, Home, Import, List, Settings, Tag } from "lucide-react";
import React from "react";
import { Link } from "react-router";

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  Sidebar as SidebarShadcn,
} from "@/components/ui/sidebar";
import { GroupSwitcher } from "./GroupSwitcher";
import { NavUser } from "./nav-user";

interface NavigationItem {
  path: string;
  title: string;
  icon: React.ReactNode;
  subItems?: NavigationItem[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: "/", title: "Dashboard", icon: <Home className="size-4" /> },
  {
    path: "/transactions",
    title: "Transactions",
    icon: <List className="size-4" />,
  },
  {
    path: "/bank-accounts",
    title: "Bank Accounts",
    icon: <Banknote className="size-4" />,
  },
  {
    path: "/categories",
    title: "Categories",
    icon: <Tag className="size-4" />,
  },
  {
    path: "/imports",
    title: "Imports",
    icon: <Import className="size-4" />,
  },
  {
    path: "/group-settings",
    title: "Group Settings",
    icon: <Settings className="size-4" />,
  },
];

// const getInitials = (name: string | null | undefined) => {
//   if (!name) return "";
//   return name
//     .toUpperCase()
//     .split(" ")
//     .filter((word) => word !== "E" && word !== "AND")
//     .slice(0, 2)
//     .map((word) => word.charAt(0))
//     .join("");
// };

export function Sidebar() {
  return (
    <SidebarShadcn variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <GroupSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Fina</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAVIGATION_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </SidebarShadcn>
  );
}
