import { zodResolver } from "@hookform/resolvers/zod"
import {
  FINANCIAL_INSTITUTIONS,
  FinancialInstitutionIdSchema,
  inferFinancialInstitutionId,
  type BankaccountOutput,
  type CreateBankaccountInputDto,
  type FinancialInstitutionId
} from "@fina/types"
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react"
import { type FC, useMemo, useState } from "react"
import type { CreditCardOutput } from "@fina/types"
import { useForm } from "react-hook-form"
import * as z from "zod"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useAccountsMutation } from "@/data/bankAccounts/useBankAccountsMutation"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useToast } from "@/hooks/use-toast"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import { FinancialInstitutionPicker } from "@/components/accounts/FinancialInstitutionPicker"
import { AccountCards } from "@/components/creditCards/AccountCards"
import { useCreditCards } from "@/data/creditCards/useCreditCards"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

const formSchema = z
  .object({
    accountName: z
      .string()
      .trim()
      .min(1, "Account name is required")
      .max(120, "Account name must be 120 characters or fewer"),
    accountType: z.enum(["checkout", "credit"]),
    institutionId: z
      .string()
      .min(1, "Choose a financial institution")
      .refine(
        (value) =>
          value === "other" ||
          FinancialInstitutionIdSchema.safeParse(value).success,
        "Choose a listed institution or Other / not listed"
      ),
    dueDate: z.string()
  })
  .superRefine((values, context) => {
    if (values.accountType !== "credit") return

    const dueDay = Number(values.dueDate)
    if (
      !/^\d+$/.test(values.dueDate) ||
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a due day from 1 to 31",
        path: ["dueDate"]
      })
    }
  })

type FormData = z.infer<typeof formSchema>

const fieldClassName =
  "h-11 rounded-md border border-fina-grid bg-fina-surface font-semibold shadow-fina-sm focus-visible:ring-fina-violet"

const accountInstitutionId = (account: BankaccountOutput) =>
  account.institutionId === undefined
    ? inferFinancialInstitutionId(account.name)
    : account.institutionId

const EditInstitutionDialog: FC<{ account: BankaccountOutput }> = ({
  account
}) => {
  const [open, setOpen] = useState(false)
  const [institutionId, setInstitutionId] =
    useState<FinancialInstitutionId | null>(accountInstitutionId(account))
  const [isSaving, setIsSaving] = useState(false)
  const { updateInstitution } = useAccountsMutation()
  const { toast } = useToast()
  const save = async () => {
    setIsSaving(true)
    try {
      await updateInstitution({ id: account.id, institutionId })
      toast({ title: "Financial institution updated" })
      setOpen(false)
    } catch {
      toast({
        title: "Could not update the financial institution",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSaving) return
        if (nextOpen) setInstitutionId(accountInstitutionId(account))
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="fina-ghost"
          aria-label={`Change institution for ${account.name}`}
        >
          <Pencil /> Change institution
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-busy={isSaving}
        className="rounded-xl border-fina-grid bg-fina-surface shadow-fina-lg"
      >
        <DialogHeader>
          <DialogTitle>Change financial institution</DialogTitle>
          <DialogDescription>
            Choose the institution for {account.name}. The account name,
            transactions, and card due day stay unchanged.
          </DialogDescription>
        </DialogHeader>
        <FinancialInstitutionPicker
          value={institutionId}
          onChange={setInstitutionId}
          accountType={account.type}
          disabled={isSaving}
          ariaLabel="Financial institution"
        />
        <DialogFooter>
          <Button
            type="button"
            variant="fina-secondary"
            disabled={isSaving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="fina-primary"
            disabled={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? "Saving..." : "Save institution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const RemoveConfirmDialog: FC<{ id: string; name: string }> = ({
  id,
  name
}) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const { removeAccount } = useAccountsMutation()
  const [isLoading, setIsLoading] = useState(false)

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      await removeAccount(id)
      toast({ title: "Successfully removed" })
      setOpen(false)
    } catch {
      toast({ title: "Something went wrong" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="fina-ghost"
          aria-label={`Remove ${name}`}
        >
          <Trash2 />
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-md border border-fina-grid bg-fina-surface shadow-fina-lg">
        <AlertDialogHeader>
          <FinaBadge tone="danger" className="w-fit">
            Archive account
          </FinaBadge>
          <AlertDialogTitle className="pt-3 text-2xl font-semibold tracking-[-0.04em]">
            Remove {name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-medium text-foreground/65">
            The account will be archived and hidden from future use. Existing
            transaction history will be retained.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} className="rounded-md">
            Cancel
          </AlertDialogCancel>
          <Button
            disabled={isLoading}
            onClick={handleRemove}
            variant="fina-danger"
          >
            {isLoading ? "Removing…" : "Remove account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const Accounts: FC = () => {
  const { selectedGroup, isGroupsLoading } = useActiveGroup()
  const { data: bankAccountsData } = useBankAccounts({
    groupId: selectedGroup?.id?.toString()
  })
  const {
    data: creditCards,
    isLoading: cardsLoading,
    isError: cardsError
  } = useCreditCards({
    groupId: selectedGroup?.id,
    includeArchived: true
  })
  const cardsByAccount = useMemo(() => {
    const grouped = new Map<string, CreditCardOutput[]>()
    for (const card of creditCards ?? []) {
      const cards = grouped.get(card.accountId) ?? []
      cards.push(card)
      grouped.set(card.accountId, cards)
    }
    return grouped
  }, [creditCards])
  const { addAccount } = useAccountsMutation()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountName: "",
      accountType: "checkout",
      institutionId: "",
      dueDate: ""
    }
  })

  const accountType = form.watch("accountType")

  const onSubmit = async (data: FormData) => {
    if (!selectedGroup?.id) {
      toast({
        title: "No active workspace",
        description: "Create or select a workspace before adding an account.",
        variant: "destructive"
      })
      return
    }

    const addAccountPayload: CreateBankaccountInputDto = {
      name: data.accountName,
      type: data.accountType,
      groupId: selectedGroup.id.toString(),
      dueDate: data.accountType === "credit" ? Number(data.dueDate) : null,
      institutionId:
        data.institutionId === "other"
          ? null
          : FinancialInstitutionIdSchema.parse(data.institutionId)
    }

    setIsLoading(true)
    try {
      await addAccount(addAccountPayload)
      toast({ title: "Successfully added" })
      form.reset()
    } catch {
      toast({ title: "Something went wrong" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Accounts"
        marker="03"
        title="Accounts"
        description="Connect the places money moves through. Account history stays intact when an account is archived."
        actions={
          <FinaBadge tone="sky">
            {bankAccountsData?.length ?? 0} active
          </FinaBadge>
        }
      />

      <main className="grid gap-8 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start md:p-8">
        <section aria-labelledby="existing-accounts-title">
          <div className="mb-4">
            <FinaSectionLabel>Registry / Active</FinaSectionLabel>
            <h2
              id="existing-accounts-title"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
            >
              Existing accounts
            </h2>
          </div>

          <FinaSurface elevation="md" className="overflow-hidden">
            {bankAccountsData?.length ? (
              <ul className="divide-y divide-fina-grid">
                {bankAccountsData.map((account, index) => {
                  const isCredit = account.type === "credit"
                  const institutionId = accountInstitutionId(account)
                  const institutionName = FINANCIAL_INSTITUTIONS.find(
                    (item) => item.id === institutionId
                  )?.name
                  return (
                    <li key={account.id} className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <FinancialInstitutionLogo
                            institutionId={institutionId}
                            accountName={account.name}
                            accountType={account.type}
                            className="size-11 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-foreground/50">
                              Account / {String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="mt-1 truncate text-lg font-semibold tracking-[-0.025em]">
                              {account.name}
                            </div>
                            <div className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground/55">
                              {isCredit ? "Credit card" : "Checking account"}
                              {institutionName ? ` · ${institutionName}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <EditInstitutionDialog account={account} />
                          <RemoveConfirmDialog
                            id={account.id}
                            name={account.name}
                          />
                        </div>
                      </div>
                      {isCredit && selectedGroup?.id ? (
                        <AccountCards
                          key={`${selectedGroup.id}:${account.id}`}
                          groupId={selectedGroup.id}
                          accountId={account.id}
                          accountName={account.name}
                          cards={cardsByAccount.get(account.id) ?? []}
                          isLoading={cardsLoading}
                          isError={cardsError}
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-10 text-center">
                <Landmark className="mx-auto size-9" />
                <p className="mt-4 font-semibold">No accounts yet</p>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Add the first account from the form beside this list.
                </p>
              </div>
            )}
          </FinaSurface>
        </section>

        <FinaSurface elevation="sm" className="p-5 sm:p-6">
          <FinaSectionLabel>New / Account</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            Add account
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-foreground/65">
            Choose your bank or card issuer so its logo appears with the account
            and its transactions.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
            >
              <FormField
                control={form.control}
                name="accountName"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[10px] font-semibold tracking-[0.16em]">
                      Account name
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={fieldClassName}
                        placeholder="e.g. Banco Inter"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountType"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[10px] font-semibold tracking-[0.16em]">
                      Account type
                    </FormLabel>
                    <Select
                      value={field.value}
                      name={field.name}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className={`w-full ${fieldClassName}`}>
                          <SelectValue onBlur={field.onBlur} ref={field.ref} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-md border border-fina-grid">
                        <SelectItem value="checkout">
                          Checking account
                        </SelectItem>
                        <SelectItem value="credit">Credit card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institutionId"
                render={({ field }) => {
                  const parsed = FinancialInstitutionIdSchema.safeParse(
                    field.value
                  )
                  const value =
                    field.value === "other"
                      ? null
                      : parsed.success
                        ? parsed.data
                        : undefined
                  return (
                    <FormItem>
                      <FormLabel className="font-mono text-[10px] font-semibold tracking-[0.16em]">
                        {accountType === "credit"
                          ? "Card issuer"
                          : "Financial institution"}
                      </FormLabel>
                      <FormControl>
                        <FinancialInstitutionPicker
                          value={value}
                          onChange={(id) => field.onChange(id ?? "other")}
                          accountType={accountType}
                          ariaLabel={
                            accountType === "credit"
                              ? "Card issuer"
                              : "Financial institution"
                          }
                          disabled={isLoading}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {accountType === "credit" ? (
                <FormField
                  control={form.control}
                  name="dueDate"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[10px] font-semibold tracking-[0.16em]">
                        Due day
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={fieldClassName}
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={31}
                          step={1}
                          placeholder="e.g. 5"
                        />
                      </FormControl>
                      <p className="text-xs font-semibold text-foreground/55">
                        Day of the month, from 1 to 31.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <Button
                type="submit"
                disabled={isLoading || isGroupsLoading || !selectedGroup}
                variant="fina-primary"
                lift
                className="w-full"
              >
                <Plus />
                {isLoading
                  ? "Adding…"
                  : isGroupsLoading
                    ? "Loading workspace…"
                    : !selectedGroup
                      ? "No active workspace"
                      : "Add account"}
              </Button>
            </form>
          </Form>
        </FinaSurface>
      </main>
    </FinaPage>
  )
}
