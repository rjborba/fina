import { Group } from "@/data/groups/Groups";
import { useGroups } from "@/data/groups/useGroups";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

interface ActiveGroupContextType {
  selectedGroup: Group["Row"] | undefined;
  groups: Group["Row"][];
  setSelectedGroup: (group: Group["Row"]) => void;
}

const ActiveGroupContext = createContext<ActiveGroupContextType | undefined>(
  undefined
);

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { data } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<Group["Row"] | undefined>(
    undefined
  );

  const groups = data || [];

  useEffect(() => {
    if (!groups) {
      return;
    }

    if (selectedGroup) {
      return;
    }

    if (groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
  }, [groups]);

  return (
    <ActiveGroupContext.Provider
      value={{ selectedGroup, groups, setSelectedGroup }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const context = useContext(ActiveGroupContext);
  if (context === undefined) {
    throw new Error(
      "useActiveGroup must be used within an ActiveGroupProvider"
    );
  }
  return context;
}
