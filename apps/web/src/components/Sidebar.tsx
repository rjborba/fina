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
      className="border-r-2 border-fina-ink"
    >
      <SidebarHeader className="border-b-2 border-white/25 p-3">
        <div className="flex h-14 items-center gap-3 overflow-hidden px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-9 shrink-0 items-center justify-center border-2 border-white bg-fina-lime font-black text-fina-ink shadow-[3px_3px_0_#fff]">
            F
          </div>
          <div className="min-w-0 leading-none group-data-[collapsible=icon]:hidden">
            <div className="text-xl font-black tracking-[-0.08em] text-white">
              FINA.
            </div>
            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.24em] text-fina-lime">
              Money, in focus
            </div>
          </div>
        </div>
        <GroupSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
            Navigation / 01
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAVIGATION_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                    className="h-11 rounded-none border border-transparent px-3 font-bold uppercase tracking-[-0.02em] text-white hover:border-fina-ink hover:bg-fina-lime hover:text-fina-ink data-[active=true]:border-fina-ink data-[active=true]:bg-fina-lime data-[active=true]:text-fina-ink data-[active=true]:shadow-[3px_3px_0_#fff]"
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
      <SidebarFooter className="border-t-2 border-white/25 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                isCollapsed ? "Expand navigation" : "Collapse navigation"
              }
              className="h-10 rounded-none border border-white/30 px-3 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white hover:border-fina-ink hover:bg-fina-lime hover:text-fina-ink"
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
