import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Check, LockKeyhole } from "lucide-react"
import { useState } from "react"
import { type Resolver, useForm } from "react-hook-form"
import { FcGoogle } from "react-icons/fc"
import { Navigate } from "react-router"
import * as z from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FinaBadge } from "@/components/ui/fina"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { LanguageSelector } from "@/components/LanguageSelector"
import { authErrorMessage } from "@/i18n/errors"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters")
})

type SignupFormData = z.infer<typeof signupSchema>

const inputClassName =
  "h-11 rounded-md border border-fina-grid bg-fina-surface px-3 shadow-none focus-visible:border-fina-violet focus-visible:ring-fina-violet/20"

export default function Login() {
  const { t } = useTranslation()

  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, signUp, user, signInWithGoogle } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SignupFormData>({
    resolver: zodResolver(
      isSignUp ? signupSchema : loginSchema
    ) as unknown as Resolver<SignupFormData>,
    defaultValues: {
      email: "",
      password: "",
      name: ""
    }
  })

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (data: SignupFormData) => {
    setError(null)
    try {
      if (isSignUp) {
        await signUp(data.email, data.password, data.name)
        setIsSignUp(false)
      } else {
        await signIn(data.email, data.password)
      }
    } catch (caughtError) {
      setError(authErrorMessage(caughtError))
    }
  }

  const toggleMode = () => {
    setIsSignUp((current) => !current)
    reset()
    setError(null)
  }

  return (
    <main className="grid min-h-svh bg-fina-canvas text-foreground lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden overflow-hidden border-r border-fina-grid bg-[#202024] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-fina-violet text-lg font-semibold text-white shadow-fina-md">
            F
          </div>
          <div>
            <div className="text-lg font-semibold tracking-[-0.04em]">Fina</div>
            <div className="mt-0.5 text-[10px] text-white/45">
              {t("Money, in focus")}
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <FinaBadge
            tone="surface"
            className="border-white/10 bg-white/10 text-white/70"
          >
            {t("Personal finance, clearly organized")}
          </FinaBadge>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
            {t("See where your money moves.")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
            {t(
              "Import statements, organize transactions, and keep shared money in one focused workspace."
            )}
          </p>
        </div>

        <div className="relative z-10 grid max-w-2xl grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
          {[t("Import"), t("Review"), t("Understand")].map((item) => (
            <div
              key={item}
              className="border-r border-white/10 p-4 last:border-r-0"
            >
              <Check className="size-4 text-[#8b95eb]" strokeWidth={2} />
              <div className="mt-3 text-xs font-medium text-white/70">
                {item}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-end">
            <LanguageSelector />
          </div>
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-fina-violet font-semibold text-white shadow-fina-sm">
              F
            </div>
            <div className="text-lg font-semibold tracking-[-0.04em]">Fina</div>
          </div>

          <FinaBadge tone={isSignUp ? "sky" : "lime"}>
            {isSignUp ? t("New workspace member") : t("Secure access")}
          </FinaBadge>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em]">
            {isSignUp ? t("Create account.") : t("Welcome back.")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/55">
            {isSignUp
              ? t(
                  "Set up your profile and start organizing your financial workspace."
                )
              : t("Sign in to continue to your financial workspace.")}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error ? (
              <Alert
                variant="destructive"
                className="rounded-md border border-red-200 bg-fina-danger text-red-700"
              >
                <AlertDescription className="font-semibold">
                  {t(error)}
                </AlertDescription>
              </Alert>
            ) : null}

            {isSignUp ? (
              <label className="block">
                <span className="text-xs font-medium text-foreground/70">
                  {t("Name")}
                </span>
                <Input
                  {...register("name")}
                  className={`mt-2 ${inputClassName}`}
                  placeholder={t("Your name")}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name ? (
                  <p className="mt-2 text-sm font-bold text-red-700">
                    {t(errors.name.message ?? "Invalid email address")}
                  </p>
                ) : null}
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-medium text-foreground/70">
                {t("Email address")}
              </span>
              <Input
                {...register("email")}
                className={`mt-2 ${inputClassName}`}
                type="email"
                placeholder="name@example.com"
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email ? (
                <p className="mt-2 text-sm font-bold text-red-700">
                  {t(errors.email.message ?? "Invalid email address")}
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-xs font-medium text-foreground/70">
                {t("Password")}
              </span>
              <Input
                {...register("password")}
                className={`mt-2 ${inputClassName}`}
                type="password"
                placeholder={t("At least 6 characters")}
                aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password ? (
                <p className="mt-2 text-sm font-bold text-red-700">
                  {t(
                    errors.password.message ??
                      "Password must be at least 6 characters"
                  )}
                </p>
              ) : null}
            </label>

            <Button
              type="submit"
              className="h-12 w-full"
              variant="fina-primary"
              lift
              disabled={isSubmitting}
            >
              <LockKeyhole />
              {isSubmitting
                ? t("Working…")
                : isSignUp
                  ? t("Create account")
                  : t("Sign in")}
              <ArrowRight className="ml-auto" />
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-fina-canvas" />
              <span className="text-[11px] text-foreground/45">
                {t("Or continue with")}
              </span>
              <div className="h-px flex-1 bg-fina-canvas" />
            </div>

            <Button
              type="button"
              variant="fina-secondary"
              className="h-12 w-full"
              onClick={() =>
                void signInWithGoogle().catch((failure: unknown) =>
                  setError(authErrorMessage(failure))
                )
              }
            >
              <FcGoogle className="size-5" />
              Google
            </Button>
          </form>

          <div className="mt-7 border-t border-fina-grid pt-5 text-center">
            <Button variant="fina-ghost" onClick={toggleMode}>
              {isSignUp
                ? t("Already have an account? Sign in")
                : t("New to Fina? Create an account")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
