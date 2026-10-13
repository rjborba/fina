import {
  FINANCIAL_INSTITUTIONS,
  inferFinancialInstitutionId,
  type FinancialInstitutionId
} from "@fina/types"
import { CreditCard, Landmark } from "lucide-react"

import bancoBvLogo from "@/assets/financial-institutions/banco-bv.svg"
import bancoDoBrasilLogo from "@/assets/financial-institutions/banco-do-brasil.svg"
import bancoPanLogo from "@/assets/financial-institutions/banco-pan.svg"
import banrisulLogo from "@/assets/financial-institutions/banrisul.svg"
import bmgLogo from "@/assets/financial-institutions/bmg.svg"
import bradescoLogo from "@/assets/financial-institutions/bradesco.svg"
import btgPactualLogo from "@/assets/financial-institutions/btg-pactual.svg"
import c6Logo from "@/assets/financial-institutions/c6.svg"
import caixaLogo from "@/assets/financial-institutions/caixa.svg"
import interLogo from "@/assets/financial-institutions/inter.webp"
import itauLogo from "@/assets/financial-institutions/itau.svg"
import mercadoPagoLogo from "@/assets/financial-institutions/mercado-pago.svg"
import neonLogo from "@/assets/financial-institutions/neon.svg"
import nubankLogo from "@/assets/financial-institutions/nubank.svg"
import pagbankLogo from "@/assets/financial-institutions/pagbank.svg"
import picpayLogo from "@/assets/financial-institutions/picpay.svg"
import safraLogo from "@/assets/financial-institutions/safra.svg"
import santanderLogo from "@/assets/financial-institutions/santander.svg"
import sicrediLogo from "@/assets/financial-institutions/sicredi.svg"
import sicoobLogo from "@/assets/financial-institutions/sicoob.svg"
import xpLogo from "@/assets/financial-institutions/xp.svg"
import { cn } from "@/lib/utils"

const institutionLogos: Record<FinancialInstitutionId, string> = {
  inter: interLogo,
  itau: itauLogo,
  nubank: nubankLogo,
  "banco-do-brasil": bancoDoBrasilLogo,
  caixa: caixaLogo,
  bradesco: bradescoLogo,
  santander: santanderLogo,
  c6: c6Logo,
  "btg-pactual": btgPactualLogo,
  safra: safraLogo,
  sicredi: sicrediLogo,
  sicoob: sicoobLogo,
  banrisul: banrisulLogo,
  "banco-pan": bancoPanLogo,
  "banco-bv": bancoBvLogo,
  bmg: bmgLogo,
  neon: neonLogo,
  picpay: picpayLogo,
  "mercado-pago": mercadoPagoLogo,
  pagbank: pagbankLogo,
  xp: xpLogo
}

export type FinancialInstitutionLogoProps = {
  institutionId?: FinancialInstitutionId | null
  accountName?: string
  accountType?: string
  className?: string
  decorative?: boolean
}

/** Institution artwork is bundled locally; names are only a legacy fallback. */
export function FinancialInstitutionLogo({
  institutionId,
  accountName,
  accountType,
  className,
  decorative = false
}: FinancialInstitutionLogoProps) {
  const resolvedId =
    institutionId === undefined
      ? inferFinancialInstitutionId(accountName ?? "")
      : institutionId
  const institution = FINANCIAL_INSTITUTIONS.find(({ id }) => id === resolvedId)
  const logo = institution ? institutionLogos[institution.id] : undefined
  const FallbackIcon = accountType === "credit" ? CreditCard : Landmark
  const fallbackLabel =
    accountType === "credit" ? "Credit card" : "Bank account"

  return (
    <span
      data-institution-id={institution?.id}
      role={!logo && !decorative ? "img" : undefined}
      aria-label={!logo && !decorative ? fallbackLabel : undefined}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-transparent",
        !logo && "text-muted-foreground",
        className
      )}
    >
      {logo && institution ? (
        <img
          src={logo}
          alt={decorative ? "" : `${institution.name} logo`}
          className={cn(
            "size-full object-contain",
            // Single-ink marks need light ink, not an opaque tile, in dark mode.
            (institution.id === "c6" || institution.id === "safra") &&
              "dark:brightness-0 dark:invert",
            // Preserve both the mark and its contrasting internal white detail.
            institution.id === "xp" && "dark:invert"
          )}
          draggable={false}
        />
      ) : (
        <FallbackIcon aria-hidden="true" className="size-[60%]" />
      )}
    </span>
  )
}
