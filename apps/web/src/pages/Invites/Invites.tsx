import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()

  const { acceptInvite } = useInvitesMutation()

  return (
    <li className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-fina-grid bg-fina-yellow">
          <Mail className="size-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <FinaSectionLabel>{t("Workspace invitation")}</FinaSectionLabel>
          <p className="mt-1 text-lg font-semibold tracking-[-0.025em] [overflow-wrap:anywhere]">
            {invite.groupName}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground/60">
            {t("You have been invited to join this group.")}
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
        {acceptInvite.isPending ? t("Accepting…") : t("Accept invite")}
      </Button>
    </li>
  )
}

const Invites = () => {
  const { t } = useTranslation()

  const { data: invites, isLoading } = useInvitesByUser()

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow={t("Invitations")}
        marker="07"
        title={t("Invitations")}
        description={t(
          "Accept a workspace invitation to access the financial records shared with you."
        )}
        actions={
          <FinaBadge tone="yellow">
            {isLoading
              ? t("Loading")
              : t("{{value0}} pending", { value0: invites?.length ?? 0 })}
          </FinaBadge>
        }
      />

      <main className="p-5 md:p-8">
        <div className="mb-4">
          <FinaSectionLabel>{t("Inbox / Access")}</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {t("Pending invitations")}
          </h2>
        </div>

        <FinaSurface elevation="md" className="overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="mx-auto size-8 animate-spin border border-fina-grid border-t-fina-lime" />
              <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.16em]">
                {t("Loading invitations")}
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
              <p className="mt-4 font-semibold">{t("Inbox is clear")}</p>
              <p className="mt-2 text-sm font-semibold text-foreground/60">
                {t("No workspace invitations are waiting for you.")}
              </p>
            </div>
          )}
        </FinaSurface>
      </main>
    </FinaPage>
  )
}

export default Invites
