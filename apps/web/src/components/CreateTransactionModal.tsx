import { FC } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useCategories } from "@/data/categories/useCategories"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { toast } from "@/hooks/use-toast"
import { CreateTransactionInputDtoType } from "@fina/types"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { BillMonthPicker } from "@/components/BillMonthPicker"
import { useBillReviewMonth } from "@/data/creditCardBills/useBillReviewMonth"
import { ApiError } from "@/api/generated"

interface CreateTransactionModalProps {
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

type FormData = {
  date: string
  description: string
  value: string
  category_id: string
  observation: string
  bankaccount_id: string
  installment_current: string
  installment_total: string
  bill_month: string
  group_id?: string
}

export const CreateTransactionModal: FC<CreateTransactionModalProps> = ({
  open,
  onOpenChange = () => {}
}) => {
  const { selectedGroup } = useActiveGroup()
  const { data: bankAccounts } = useBankAccounts({
    groupId: selectedGroup?.id?.toString()
  })
  const { data: categories } = useCategories({
    groupId: selectedGroup?.id?.toString()
  })
  const { addMutation } = useTransactionMutation()

  const form = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      value: "",
      category_id: "",
      observation: "",
      bankaccount_id: "",
      installment_current: "",
      installment_total: "",
      bill_month: "",
      group_id: selectedGroup?.id
    }
  })
  const selectedAccountId = form.watch("bankaccount_id")
  const selectedAccount = bankAccounts?.find(
    (account) => account.id.toString() === selectedAccountId
  )
  const creditCardSelected = selectedAccount?.type === "credit"
  const {
    reviewMonth,
    setReviewMonth,
    resetReviewMonth,
    isLoading: reviewMonthLoading
  } = useBillReviewMonth(
    creditCardSelected ? selectedAccountId : undefined,
    form.watch("bill_month")
  )

  const onSubmit = async (data: FormData) => {
    try {
      const selectedAccount = bankAccounts?.find(
        (account) => account.id.toString() === data.bankaccount_id
      )

      if (!data.group_id) {
        throw new Error("Group ID is required")
      }
      if (selectedAccount?.type === "credit" && !data.bill_month) {
        throw new Error("Bill month is required")
      }

      const transactionData: CreateTransactionInputDtoType = {
        date: data.date ? new Date(data.date) : null,
        billMonth: selectedAccount?.type === "credit" ? data.bill_month : null,
        reviewMonth:
          selectedAccount?.type === "credit" ? reviewMonth : undefined,
        description: data.description,
        value: data.value ? parseFloat(data.value) : null,
        categoryId: data.category_id ? data.category_id : null,
        observation: data.observation || null,
        bankaccountId: data.bankaccount_id,
        installmentCurrent: data.installment_current
          ? data.installment_current
          : null,
        installmentTotal: data.installment_total
          ? parseInt(data.installment_total)
          : null,
        groupId: data.group_id.toString()
      }

      await addMutation.mutateAsync(transactionData)
      toast({
        title: "Transaction created successfully"
      })
      form.reset()
      resetReviewMonth()
      onOpenChange?.(false)
    } catch (error) {
      toast({
        title: "Failed to create transaction",
        description:
          error instanceof ApiError &&
          (error.body as { code?: unknown } | null)?.code ===
            "BILL_REVIEW_MONTH_CONFLICT"
            ? "This bill already has a different review month. Change the month for the whole bill from its details, then try again."
            : "Check the required fields and try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
          <DialogDescription>
            Add a transaction to the selected account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankaccount_id">Account</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("bankaccount_id", value)
                form.setValue("bill_month", "")
                resetReviewMonth()
              }}
              value={selectedAccountId}
            >
              <SelectTrigger id="bankaccount_id">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...form.register("date")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...form.register("value")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              onValueChange={(value) =>
                form.setValue("category_id", value === "-" ? "" : value)
              }
              value={form.watch("category_id")}
            >
              <SelectTrigger id="category_id">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">-</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <span className="flex items-center gap-2">
                      <CategoryAppearance
                        icon={category.icon}
                        color={category.color}
                        className="size-6 border"
                      />
                      {category.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation">Observation</Label>
            <Input id="observation" {...form.register("observation")} />
          </div>

          {creditCardSelected ? (
            <div className="space-y-4">
              <BillMonthPicker
                id="bill_month"
                value={form.watch("bill_month")}
                dueDate={selectedAccount?.dueDate}
                onValueChange={(value) => {
                  resetReviewMonth()
                  form.setValue("bill_month", value, {
                    shouldDirty: true,
                    shouldValidate: true
                  })
                }}
              />
              <BillMonthPicker
                id="transaction-review-month"
                label="Include in monthly review"
                description="All purchases in the same bill share this month. Existing bills keep their saved month."
                value={reviewMonth}
                disabled={!form.watch("bill_month") || reviewMonthLoading}
                onValueChange={setReviewMonth}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installment_current">
                    Current Installment
                  </Label>
                  <Input
                    id="installment_current"
                    type="number"
                    {...form.register("installment_current")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installment_total">Total Installments</Label>
                  <Input
                    id="installment_total"
                    type="number"
                    {...form.register("installment_total")}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={
              addMutation.isPending ||
              (creditCardSelected &&
                (!form.watch("bill_month") ||
                  !reviewMonth ||
                  reviewMonthLoading))
            }
          >
            Create Transaction
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
