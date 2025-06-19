import { User } from "@supabase/supabase-js";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  user: User;
  isSidebarCollapsed: boolean;
}

export function UserProfile({ user, isSidebarCollapsed }: UserProfileProps) {
  const avatarUrl = user.user_metadata?.avatar_url;
  const userInitial = user.user_metadata?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex items-center gap-2 px-2 py-1 hover:bg-muted">
      <div
        className={cn({
          "flex items-center": true,
          "gap-2 px-2 py-1": !isSidebarCollapsed && user,
        })}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt="User avatar" />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        {!isSidebarCollapsed && user && (
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {user.user_metadata?.name || "User"}
            </span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}
