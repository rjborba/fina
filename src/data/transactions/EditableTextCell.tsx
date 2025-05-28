import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { FC, useEffect, useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => Promise<unknown>;
  className?: string;
}

export const EditableText: FC<EditableTextProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleAccept = () => {
    if (editValue !== value) {
      onChange(editValue).catch(() => {
        toast({ title: "Something went wrong", variant: "destructive" });
        setEditValue(value);
      });
    }
    setIsEditing(false);
  };

  const handleReject = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
        className={cn("cursor-pointer hover:bg-accent/50 p-2", className)}
        onClick={() => setIsEditing(true)}
      >
        {editValue || "-"}
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
        onBlur={handleAccept}
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
