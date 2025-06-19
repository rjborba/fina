import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGroupById } from "@/data/groups/useGroup";
import { Invite } from "@/data/Invites/Invite";
import { useInvitesByUser } from "@/data/Invites/useInvitesByUser";

const InviteItem = (invite: Invite) => {
  const { data: group, isLoading } = useGroupById(invite.group_id);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  return (
    <div key={invite.id} className="flex gap-3 items-center">
      <div>You have been invite to join group {group.name}</div>
      <Button>Accept</Button>
    </div>
  );
};

const Invites = () => {
  const { data: invites, isLoading } = useInvitesByUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!invites?.length) {
    return <div>No invite found</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        {invites.map((invite) => (
          <InviteItem key={invite.id} {...invite} />
        ))}
      </CardContent>

      <CardFooter>
        <div>todo</div>
      </CardFooter>
    </Card>
  );
};

export default Invites;
