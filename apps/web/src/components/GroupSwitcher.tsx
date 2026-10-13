"use client"
import { ChevronsUpDown, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { cn } from "@/lib/utils"

export function GroupSwitcher() {
  const { isMobile } = useSidebar()
  const { selectedGroup, groups, setSelectedGroup } = useActiveGroup()

  if (!selectedGroup) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn("h-12 rounded-md border border-sidebar-border")}
            >
              <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-fina-lime text-fina-violet">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {selectedGroup.name}
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/50">
                  Active workspace
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border border-fina-grid bg-fina-surface shadow-fina-md"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-[11px] font-medium text-foreground/50">
              Workspaces
            </DropdownMenuLabel>
            {groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="gap-2 rounded-md p-2.5 font-medium focus:bg-fina-lime focus:text-foreground"
              >
                {group.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add team</div>
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
