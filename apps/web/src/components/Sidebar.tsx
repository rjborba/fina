import {
  Banknote,
  Home,
  Import,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Tag
} from "lucide-react"
import React from "react"
import { NavLink, useLocation } from "react-router"

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
  useSidebar
} from "@/components/ui/sidebar"
import { GroupSwitcher } from "./GroupSwitcher"
import { NavUser } from "./nav-user"

interface NavigationItem {
  path: string
  title: string
  icon: React.ReactNode
  subItems?: NavigationItem[]
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: "/", title: "Dashboard", icon: <Home className="size-4" /> },
  {
    path: "/transactions",
    title: "Transactions",
    icon: <List className="size-4" />
  },
  {
    path: "/bank-accounts",
    title: "Bank Accounts",
    icon: <Banknote className="size-4" />
  },
  {
    path: "/categories",
    title: "Categories",
    icon: <Tag className="size-4" />
  },
  {
    path: "/imports",
    title: "Imports",
    icon: <Import className="size-4" />
  },
  {
    path: "/settings",
    title: "Settings",
    icon: <Settings className="size-4" />
  }
]

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
  const location = useLocation()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarShadcn
      variant="sidebar"
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex h-12 items-center gap-3 overflow-hidden px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fina-violet text-sm font-semibold text-white shadow-fina-sm">
            F
          </div>
          <div className="min-w-0 leading-none group-data-[collapsible=icon]:hidden">
            <div className="text-[15px] font-semibold tracking-[-0.03em] text-sidebar-foreground">
              Fina
            </div>
            <div className="mt-1 text-[10px] text-sidebar-foreground/50">
              Financial workspace
            </div>
          </div>
        </div>
        <GroupSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAVIGATION_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                    className="h-9 rounded-md border border-transparent px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <NavLink to={item.path} end={item.path === "/"}>
                      {item.icon}
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                isCollapsed ? "Expand navigation" : "Collapse navigation"
              }
              className="h-9 rounded-md border border-transparent px-3 text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
              <span>{isCollapsed ? "Expand" : "Collapse"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </SidebarShadcn>
  )
}
