import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpRight, Plus, Users } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import * as z from "zod"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
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
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useGroupsMutation } from "@/data/groups/useGroupsMutation"
import { toast } from "@/hooks/use-toast"

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required")
})

type GroupFormValues = z.infer<typeof groupFormSchema>

export function Settings() {
  const { groups, selectedGroup } = useActiveGroup()
  const { addGroup } = useGroupsMutation()

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: ""
    }
  })

  const onSubmit = async (data: GroupFormValues) => {
    try {
      await addGroup.mutateAsync({ name: data.name.trim() })
      form.reset()
      toast({
        title: "Group created",
        description: "The new group has been created successfully."
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Settings"
        marker="06"
        title="Your workspaces."
        description="Groups separate people and financial data. Open a workspace to manage its members, invitations, and lifecycle."
        actions={<FinaBadge tone="surface">{groups.length} groups</FinaBadge>}
      />

      <main className="grid gap-8 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start md:p-8">
        <section aria-labelledby="group-list-title">
          <div className="mb-4">
            <FinaSectionLabel>Groups / Access</FinaSectionLabel>
            <h2
              id="group-list-title"
              className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
            >
              Available workspaces
            </h2>
          </div>

          <FinaSurface elevation="md" className="overflow-hidden">
            {groups.length ? (
              <ul className="divide-y-2 divide-fina-ink">
                {groups.map((group, index) => {
                  const isActive = group.id === selectedGroup?.id
                  return (
                    <li key={group.id}>
                      <Link
                        to={`/group-details/${group.id}`}
                        className="group flex min-h-24 items-center justify-between gap-4 p-4 transition-colors hover:bg-fina-yellow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-fina-violet sm:p-5"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className={`flex size-12 shrink-0 items-center justify-center border-2 border-fina-ink ${isActive ? "bg-fina-lime" : "bg-fina-surface"}`}
                          >
                            <Users className="size-5" strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-fina-ink/45">
                              Workspace / {String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="mt-1 truncate text-lg font-black tracking-[-0.025em]">
                              {group.name}
                            </div>
                            {isActive ? (
                              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                Active group
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-10 text-center">
                <Users className="mx-auto size-9" />
                <p className="mt-4 font-black uppercase">No groups yet</p>
              </div>
            )}
          </FinaSurface>
        </section>

        <FinaSurface tone="lime" elevation="lg" className="p-5 sm:p-6">
          <FinaSectionLabel>New / Workspace</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
            Create group
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-fina-ink/65">
            A group is a private boundary for accounts, transactions and people.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                      Group name
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-none border-2 border-fina-ink bg-fina-surface font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
                        placeholder="e.g. Home"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                variant="fina-secondary"
                lift
                className="w-full"
              >
                <Plus />
                {form.formState.isSubmitting ? "Creating…" : "Create group"}
              </Button>
            </form>
          </Form>
        </FinaSurface>
      </main>
    </FinaPage>
  )
}
