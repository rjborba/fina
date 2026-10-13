import { Check, Mail, Users } from "lucide-react"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { Button } from "@/components/ui/button"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { Invite } from "@/data/Invites/Invite"
import { useInvitesByUser } from "@/data/Invites/useInvitesByUser"
import { useInvitesMutation } from "@/data/Invites/useInvitesMutation"

function InviteItem({ invite }: { invite: Invite }) {
  const { acceptInvite } = useInvitesMutation()

  return (
    <li className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-fina-grid bg-fina-yellow">
          <Mail className="size-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <FinaSectionLabel>Workspace invitation</FinaSectionLabel>
          <p className="mt-1 text-lg font-semibold tracking-[-0.025em]">
            {invite.groupName}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground/60">
            You have been invited to join this group.
          </p>
        </div>
      </div>
      <Button
        variant="fina-primary"
        lift
        disabled={acceptInvite.isPending}
        onClick={() => acceptInvite.mutate(invite.id)}
      >
        <Check />
        {acceptInvite.isPending ? "Accepting…" : "Accept invite"}
      </Button>
    </li>
  )
}

const Invites = () => {
  const { data: invites, isLoading } = useInvitesByUser()

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Invitations"
        marker="07"
        title="Invitations"
        description="Accept a workspace invitation to access the financial records shared with you."
        actions={
          <FinaBadge tone="yellow">
            {isLoading ? "Loading" : `${invites?.length ?? 0} pending`}
          </FinaBadge>
        }
      />

      <main className="p-5 md:p-8">
        <div className="mb-4">
          <FinaSectionLabel>Inbox / Access</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            Pending invitations
          </h2>
        </div>

        <FinaSurface elevation="md" className="overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="mx-auto size-8 animate-spin border border-fina-grid border-t-fina-lime" />
              <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.16em]">
                Loading invitations
              </p>
            </div>
          ) : invites?.length ? (
            <ul className="divide-y divide-fina-grid">
              {invites.map((invite) => (
                <InviteItem key={invite.id} invite={invite} />
              ))}
            </ul>
          ) : (
            <div className="p-10 text-center">
              <Users className="mx-auto size-10" />
              <p className="mt-4 font-semibold">Inbox is clear</p>
              <p className="mt-2 text-sm font-semibold text-foreground/60">
                No workspace invitations are waiting for you.
              </p>
            </div>
          )}
        </FinaSurface>
      </main>
    </FinaPage>
  )
}

export default Invites
