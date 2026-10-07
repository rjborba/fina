import {
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  TriangleAlert,
  User,
  Users
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { Input } from "@/components/ui/input"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useGroupsMutation } from "@/data/groups/useGroupsMutation"
import { useInvites } from "@/data/Invites/useInvites"
import { useInvitesMutation } from "@/data/Invites/useInvitesMutation"
import { useUsersPerGroup } from "@/data/usersPerGroup/usersPerGroup"
import { toast } from "@/hooks/use-toast"
import { ReviewSettings } from "./ReviewSettings"

export function GroupDetails() {
  const [inviteEmail, setInviteEmail] = useState("")
  const { groupId } = useParams()
  const { removeGroup } = useGroupsMutation()
  const navigate = useNavigate()
  const { data: usersPerGroup } = useUsersPerGroup({ groupId })
  const { groups } = useActiveGroup()
  const { data: invites } = useInvites(groupId)
  const { addInvite, removeInvite } = useInvitesMutation()
  const group = groups.find((item) => item.id === groupId)

  if (!group) {
    return (
      <FinaPage>
        <FinaPageHeader
          eyebrow="Settings"
          marker="06"
          title="Group not found."
          description="This workspace is not available to your account."
          actions={
            <Button asChild variant="fina-secondary">
              <Link to="/settings">
                <ArrowLeft /> Back to settings
              </Link>
            </Button>
          }
        />
      </FinaPage>
    )
  }

  const createInvite = async () => {
    try {
      await addInvite.mutateAsync({ email: inviteEmail, groupId: group.id })
      setInviteEmail("")
      toast({
        title: "Invitation created",
        description: "The invitation is ready to accept"
      })
    } catch {
      toast({
        title: "Error sending invite",
        description: "Please try again later"
      })
    }
  }

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Workspace"
        marker="06.1"
        title={group.name}
        description="Manage who can access this workspace and its financial records."
        actions={
          <Button asChild variant="fina-secondary" lift>
            <Link to="/settings">
              <ArrowLeft /> All groups
            </Link>
          </Button>
        }
      />

      <main className="space-y-8 p-5 md:p-8">
        <ReviewSettings
          key={`${group.id}:${group.creditCardReviewMonthOffset}`}
          group={group}
        />
        <section aria-labelledby="people-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <FinaSectionLabel>Access / People</FinaSectionLabel>
              <h2
                id="people-title"
                className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
              >
                Members & invitations
              </h2>
            </div>
            <FinaBadge tone="sky">
              {(usersPerGroup?.length ?? 0) + (invites?.length ?? 0)} entries
            </FinaBadge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:items-start">
            <FinaSurface elevation="md" className="overflow-hidden">
              <div className="border-b-2 border-fina-ink bg-fina-ink px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Workspace access list
              </div>
              <ul className="divide-y-2 divide-fina-ink">
                {usersPerGroup?.map((member) => (
                  <li
                    key={member.userId}
                    className="flex min-h-20 items-center gap-4 p-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-lime">
                      <User className="size-4" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black">{member.email}</div>
                      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-fina-ink/45">
                        Active member
                      </div>
                    </div>
                  </li>
                ))}
                {invites?.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex min-h-20 items-center justify-between gap-4 bg-fina-yellow/60 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-yellow">
                        <Mail className="size-4" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-black">
                          {invite.email}
                        </div>
                        <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-fina-ink/45">
                          Invitation pending
                        </div>
                      </div>
                    </div>
                    <ConfirmationDialog
                      trigger={
                        <Button
                          size="icon"
                          variant="fina-ghost"
                          aria-label={`Remove invitation for ${invite.email}`}
                        >
                          <Trash2 />
                        </Button>
                      }
                      title="Remove invitation?"
                      description="This person will no longer be able to accept this invitation."
                      confirmText="Remove invite"
                      onConfirm={async () => {
                        try {
                          await removeInvite.mutateAsync(invite.id)
                        } catch {
                          toast({
                            title: "Error removing invite",
                            description: "Please try again later",
                            variant: "destructive"
                          })
                        }
                      }}
                    />
                  </li>
                ))}
                {!usersPerGroup?.length && !invites?.length ? (
                  <li className="p-10 text-center">
                    <Users className="mx-auto size-9" />
                    <p className="mt-4 font-black uppercase">No people found</p>
                  </li>
                ) : null}
              </ul>
            </FinaSurface>

            <FinaSurface tone="sky" elevation="lg" className="p-5">
              <FinaSectionLabel>Invite / Email</FinaSectionLabel>
              <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.035em]">
                Add a person
              </h3>
              <p className="mt-2 text-sm font-semibold leading-5 text-fina-ink/65">
                Create a pending invitation for this workspace.
              </p>
              <label className="mt-5 block font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                Email address
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="mt-2 h-11 rounded-none border-2 border-fina-ink bg-fina-surface font-sans font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </label>
              <Button
                variant="fina-primary"
                lift
                className="mt-4 w-full"
                onClick={createInvite}
                disabled={
                  addInvite.isPending ||
                  !inviteEmail.includes("@") ||
                  !inviteEmail.includes(".")
                }
              >
                <Plus />
                {addInvite.isPending ? "Creating…" : "Create invite"}
              </Button>
            </FinaSurface>
          </div>
        </section>

        <FinaSurface tone="danger" elevation="md" className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <FinaSectionLabel>Danger / Permanent</FinaSectionLabel>
              <h2 className="mt-2 flex items-center gap-2 text-xl font-black uppercase tracking-[-0.035em]">
                <TriangleAlert className="size-5" /> Delete workspace
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-fina-ink/70">
                This erases all data associated with the group. You must type
                the exact group name to confirm.
              </p>
            </div>
            <ConfirmationDialog
              trigger={<Button variant="fina-danger">Remove group</Button>}
              title={`Remove ${group.name}?`}
              description="All data associated with the group will be erased. This action cannot be undone."
              requiredConfirmationText={group.name}
              confirmText="Permanently remove"
              onConfirm={async (confirmation) => {
                try {
                  await removeGroup.mutateAsync({
                    id: group.id,
                    confirmName: confirmation ?? ""
                  })
                  navigate("/settings")
                } catch {
                  toast({
                    title: "Error removing group",
                    description: "Please try again later",
                    variant: "destructive"
                  })
                }
              }}
            />
          </div>
        </FinaSurface>
      </main>
    </FinaPage>
  )
}
