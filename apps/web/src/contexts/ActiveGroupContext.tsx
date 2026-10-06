/* eslint-disable react-refresh/only-export-components */
import { Group } from "@/data/groups/Groups"
import { useGroups } from "@/data/groups/useGroups"
import useLocalStorageState from "@/hooks/useLocalStorageState"
import { createContext, useContext, ReactNode, useEffect } from "react"

interface ActiveGroupContextType {
  selectedGroup: Group["Row"] | undefined
  groups: Group["Row"][]
  isGroupsLoading: boolean
  setSelectedGroup: (group: Group["Row"]) => void
}

const ActiveGroupContext = createContext<ActiveGroupContextType | undefined>(
  undefined
)

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { data: groups, isPending: isGroupsLoading } = useGroups()
  const [selectedGroupId, setSelectedGroupId] = useLocalStorageState<string>(
    "activeGroupId",
    ""
  )
  const storedGroup = groups?.find((group) => group.id === selectedGroupId)
  const selectedGroup = storedGroup ?? groups?.[0]

  useEffect(() => {
    if (!groups) {
      return
    }

    if (!storedGroup) {
      setSelectedGroupId(groups[0]?.id ?? "")
    }
  }, [groups, storedGroup, setSelectedGroupId])

  const setSelectedGroup = (group: Group["Row"]) => {
    setSelectedGroupId(group.id)
  }

  return (
    <ActiveGroupContext.Provider
      value={{
        selectedGroup,
        groups: groups || [],
        isGroupsLoading,
        setSelectedGroup
      }}
    >
      {children}
    </ActiveGroupContext.Provider>
  )
}

export function useActiveGroup() {
  const context = useContext(ActiveGroupContext)
  if (context === undefined) {
    throw new Error("useActiveGroup must be used within an ActiveGroupProvider")
  }
  return context
}
