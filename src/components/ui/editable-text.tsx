import * as React from "react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleAccept = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleReject = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAccept();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleReject();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn(
          "cursor-pointer hover:bg-accent/50 p-2 rounded",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        {value || "-"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAccept}
        className="h-8 w-8"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReject}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
