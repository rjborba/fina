import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  TriangleAlert,
  User,
  Users
} from "lucide-react"
import { RenameGroupInputSchema } from "@fina/types"
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

export function GroupDetails() {
  const { t } = useTranslation()

  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [renameError, setRenameError] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const { groupId } = useParams()
  const { removeGroup, renameGroup } = useGroupsMutation()
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
          eyebrow={t("Settings")}
          marker="06"
          title={t("Group not found.")}
          description={t("This workspace is not available to your account.")}
          actions={
            <Button asChild variant="fina-secondary">
              <Link to="/settings">
                <ArrowLeft /> {t("Back to settings")}
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
        title: t("Invitation created"),
        description: t("The invitation is ready to accept")
      })
    } catch {
      toast({
        title: t("Error sending invite"),
        description: t("Please try again later")
      })
    }
  }

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow={t("Workspace")}
        marker="06.1"
        title={group.name}
        description={t(
          "Manage who can access this workspace and its financial records."
        )}
        actions={
          <Button asChild variant="fina-secondary" lift>
            <Link to="/settings">
              <ArrowLeft /> {t("All groups")}
            </Link>
          </Button>
        }
      />

      <main className="space-y-8 p-5 md:p-8">
        {group.isOwner ? (
          <FinaSurface className="p-5">
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                const parsed = RenameGroupInputSchema.safeParse({
                  name: workspaceName ?? group.name
                })
                if (!parsed.success) {
                  setRenameError(
                    "Enter a workspace name between 1 and 120 characters."
                  )
                  return
                }
                setRenameError("")
                try {
                  await renameGroup.mutateAsync({
                    id: group.id,
                    name: parsed.data.name
                  })
                  setWorkspaceName(null)
                  toast({ title: t("Workspace renamed") })
                } catch {
                  setRenameError(
                    "Could not rename the workspace. Please try again."
                  )
                }
              }}
            >
              <label htmlFor="workspace-name" className="block font-semibold">
                {t("Workspace name")}
              </label>
              <Input
                id="workspace-name"
                value={workspaceName ?? group.name}
                maxLength={120}
                disabled={renameGroup.isPending}
                aria-invalid={Boolean(renameError)}
                aria-describedby={
                  renameError ? "workspace-name-error" : undefined
                }
                onChange={(event) => {
                  setWorkspaceName(event.target.value)
                  setRenameError("")
                }}
              />
              {renameError ? (
                <p id="workspace-name-error" role="alert">
                  {t(renameError)}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={
                  renameGroup.isPending ||
                  (workspaceName ?? group.name).trim() === group.name
                }
              >
                {renameGroup.isPending ? t("Saving…") : t("Save name")}
              </Button>
            </form>
          </FinaSurface>
        ) : null}

        <section aria-labelledby="people-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <FinaSectionLabel>{t("Access / People")}</FinaSectionLabel>
              <h2
                id="people-title"
                className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
              >
                {t("Members & invitations")}
              </h2>
            </div>
            <FinaBadge tone="sky">
              {t("entriesCount", {
                count: (usersPerGroup?.length ?? 0) + (invites?.length ?? 0)
              })}
            </FinaBadge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:items-start">
            <FinaSurface elevation="md" className="overflow-hidden">
              <div className="border-b border-fina-grid bg-fina-canvas px-4 py-3 text-xs font-medium text-foreground/60">
                {t("Workspace access list")}
              </div>
              <ul className="divide-y divide-fina-grid">
                {usersPerGroup?.map((member) => (
                  <li
                    key={member.userId}
                    className="flex min-h-20 items-center gap-4 p-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center border border-fina-grid bg-fina-lime">
                      <User className="size-4" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {member.email}
                      </div>
                      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/45">
                        {t("Active member")}
                      </div>
                    </div>
                  </li>
                ))}
                {invites?.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex min-h-20 items-center justify-between gap-4 bg-fina-canvas p-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center border border-fina-grid bg-fina-yellow">
                        <Mail className="size-4" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {invite.email}
                        </div>
                        <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/45">
                          {t("Invitation pending")}
                        </div>
                      </div>
                    </div>
                    <ConfirmationDialog
                      trigger={
                        <Button
                          size="icon"
                          variant="fina-ghost"
                          aria-label={t("Remove invitation for {{value0}}", {
                            value0: invite.email
                          })}
                        >
                          <Trash2 />
                        </Button>
                      }
                      title={t("Remove invitation?")}
                      description={t(
                        "This person will no longer be able to accept this invitation."
                      )}
                      confirmText={t("Remove invite")}
                      onConfirm={async () => {
                        try {
                          await removeInvite.mutateAsync(invite.id)
                        } catch {
                          toast({
                            title: t("Error removing invite"),
                            description: t("Please try again later"),
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
                    <p className="mt-4 font-semibold">{t("No people found")}</p>
                  </li>
                ) : null}
              </ul>
            </FinaSurface>

            <FinaSurface elevation="sm" className="p-5">
              <FinaSectionLabel>{t("Invite / Email")}</FinaSectionLabel>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em]">
                {t("Add a person")}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-5 text-foreground/65">
                {t("Create a pending invitation for this workspace.")}
              </p>
              <label className="mt-5 block font-mono text-[10px] font-semibold tracking-[0.16em]">
                {t("Email address")}
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="mt-2 h-11 rounded-md border border-fina-grid bg-fina-surface font-sans font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
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
                {addInvite.isPending ? t("Creating…") : t("Create invite")}
              </Button>
            </FinaSurface>
          </div>
        </section>

        <FinaSurface tone="danger" elevation="md" className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <FinaSectionLabel>{t("Danger / Permanent")}</FinaSectionLabel>
              <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.035em]">
                <TriangleAlert className="size-5" /> {t("Delete workspace")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-foreground/70">
                {t(
                  "This erases all data associated with the group. You must type the exact group name to confirm."
                )}
              </p>
            </div>
            <ConfirmationDialog
              trigger={
                <Button variant="fina-danger">{t("Remove group")}</Button>
              }
              title={t("Remove {{value0}}?", { value0: group.name })}
              description={t(
                "All data associated with the group will be erased. This action cannot be undone."
              )}
              requiredConfirmationText={group.name}
              confirmText={t("Permanently remove")}
              onConfirm={async (confirmation) => {
                try {
                  await removeGroup.mutateAsync({
                    id: group.id,
                    confirmName: confirmation ?? ""
                  })
                  navigate("/settings")
                } catch {
                  toast({
                    title: t("Error removing group"),
                    description: t("Please try again later"),
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
