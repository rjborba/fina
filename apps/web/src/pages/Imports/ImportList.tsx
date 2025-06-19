import { Button } from "@/components/ui/button";
import { useImports } from "@/data/imports/useImports";
import { useImportsMutation } from "@/data/imports/useImportsMutation";
import { FC } from "react";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
export const ImportList: FC = () => {
  const { selectedGroup } = useActiveGroup();
  const { data: importsData } = useImports({
    groupId: selectedGroup?.id?.toString(),
  });
  const { removeImport } = useImportsMutation();

  return (
    <div className="border border-back rounded-md p-5 w-full">
      <h2>Imports</h2>
      <div className="flex flex-col max-w-sm">
        <ul>
          {importsData?.map((importData) => {
            return (
              <li className="py-1" key={importData.id}>
                <div className="flex gap-1 items-center">
                  <div>{importData.fileName}</div>
                  <div>
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={() => removeImport(importData.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
