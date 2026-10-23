"use client"

import { useTranslation } from "react-i18next"

import { ChevronsUpDown, LogOut, MonitorCog, Moon, Sun } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "./ThemeProvider"
import { LanguageSelector } from "./LanguageSelector"

export function NavUser() {
  const { t } = useTranslation()

  const { isMobile } = useSidebar()
  const { signOut, user } = useAuth()
  const { setTheme } = useTheme()

  if (!user) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 rounded-md border border-sidebar-border"
            >
              <Avatar className="h-7 w-7 rounded-md border border-sidebar-border">
                <AvatarImage
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.name}
                />
                <AvatarFallback className="rounded-md bg-fina-violet font-semibold text-white">
                  {user.user_metadata.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.user_metadata.name}
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/50">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-fina-grid bg-fina-surface shadow-fina-md"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-md border border-fina-grid">
                  <AvatarImage
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata.name}
                  />
                  <AvatarFallback className="rounded-md bg-fina-violet font-semibold text-white">
                    {user.user_metadata.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.user_metadata.name}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <LanguageSelector />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="[&_div]:rounded-md [&_div]:font-medium [&_div]:focus:bg-fina-lime [&_div]:focus:text-foreground">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun /> {t("Light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon /> {t("Dark")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <MonitorCog />
                {t("System")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-md font-medium text-red-600 focus:bg-fina-danger focus:text-red-700"
              onClick={() => signOut()}
            >
              <LogOut />
              {t("Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
