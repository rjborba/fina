import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useGroupsMutation } from "@/data/groups/useGroupsMutation";
import { useInvites } from "@/data/Invites/useInvites";
import { useInvitesMutation } from "@/data/Invites/useInvitesMutation";
import { useUsersPerGroup } from "@/data/usersPerGroup/usersPerGroup";
import { toast } from "@/hooks/use-toast";
import { Trash, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

export function GroupDetails() {
  const [inviteEmail, setInviteEmail] = useState("");
  const { groupId } = useParams();
  const { removeGroup } = useGroupsMutation();
  const navigate = useNavigate();
  const { data: usersPerGroup } = useUsersPerGroup({
    groupId,
  });

  const { groups } = useActiveGroup();

  const { data: invites } = useInvites(Number(groupId));
  const { addInvite, removeInvite } = useInvitesMutation();

  const group = groups.find((group) => group.id === Number(groupId));

  if (!group) {
    return <div>Error. No group</div>;
  }

  return (
    <div className="p-4 w-full space-y-4">
      <h3 className="text-2xl font-bold">Settings</h3>

      <Card>
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Users</div>
          <div className="flex flex-col gap-3 py-4">
            {usersPerGroup?.map((user) => (
              <div key={user.user_id}>
                <div className="flex flex-col">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    #{user.user_id}
                  </div>
                </div>
              </div>
            ))}
            {invites?.map((invite) => (
              <div key={invite.id} className="flex items-center gap-1">
                <div className="font-medium">{invite.email} (Pending)</div>
                <ConfirmationDialog
                  trigger={
                    <Button size="icon" variant="ghost">
                      <Trash />
                    </Button>
                  }
                  title={<span>Remove Invite</span>}
                  description="Are you sure you want to remove this invite?"
                  onConfirm={async () => {
                    await removeInvite.mutateAsync(invite.id).catch(() => {
                      toast({
                        title: "Error removing invite",
                        description: "Please try again later",
                        variant: "destructive",
                      });
                    });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              type="email"
              placeholder="Email"
              className="max-w-[400px]"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() =>
                addInvite
                  .mutateAsync({
                    email: inviteEmail,
                    group_id: Number(groupId),
                  })
                  .then(() => {
                    setInviteEmail("");
                    toast({
                      title: "Invite sent",
                      description:
                        "The user will receive an email with the invite",
                    });
                  })
                  .catch(() => {
                    toast({
                      title: "Error sending invite",
                      description: "Please try again later",
                    });
                  })
              }
              disabled={
                addInvite.isPending ||
                !inviteEmail?.includes("@") ||
                !inviteEmail?.includes(".")
              }
            >
              Send Invite
            </Button>
          </div>
        </CardContent>

        <CardFooter>
          <ConfirmationDialog
            trigger={<Button>Remove Group</Button>}
            title={
              <span>
                Remove Group{" "}
                <TriangleAlert className="text-destructive inline-block" />{" "}
              </span>
            }
            description="All data associated with the group will be erased. Are you sure
                you want to remove this group?"
            onConfirm={async () => {
              await removeGroup
                .mutateAsync(group.id)
                .then(() => {
                  navigate("/settings");
                })
                .catch(() => {
                  toast({
                    title: "Error removing group",
                    description: "Please try again later",
                    variant: "destructive",
                  });
                });
            }}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
