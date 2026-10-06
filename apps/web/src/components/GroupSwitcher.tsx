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
              className={cn(
                "h-14 rounded-none border border-white/25 text-white hover:border-fina-ink hover:bg-fina-sky hover:text-fina-ink data-[state=open]:border-fina-ink data-[state=open]:bg-fina-sky data-[state=open]:text-fina-ink"
              )}
            >
              <div className="flex aspect-square size-8 items-center justify-center border border-white/50 bg-white/10 group-data-[state=open]:border-fina-ink">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-black">
                  {selectedGroup.name}
                </span>
                <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.12em] opacity-60">
                  Active workspace
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-none border-2 border-fina-ink bg-fina-surface shadow-fina-md"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/50">
              Workspaces
            </DropdownMenuLabel>
            {groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="gap-2 rounded-none p-3 font-bold focus:bg-fina-lime focus:text-fina-ink"
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
