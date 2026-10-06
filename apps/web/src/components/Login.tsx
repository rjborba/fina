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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters")
})

type SignupFormData = z.infer<typeof signupSchema>

const inputClassName =
  "h-12 rounded-none border-2 border-fina-ink bg-fina-surface px-4 font-semibold shadow-fina-sm focus-visible:ring-fina-violet"

export default function Login() {
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
      setError(
        caughtError instanceof Error ? caughtError.message : "An error occurred"
      )
    }
  }

  const toggleMode = () => {
    setIsSignUp((current) => !current)
    reset()
    setError(null)
  }

  return (
    <main className="grid min-h-svh bg-fina-grid text-fina-ink lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="transactions-hero relative hidden overflow-hidden border-r-[3px] border-fina-ink p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center border-2 border-fina-ink bg-fina-lime text-xl font-black shadow-fina-md">
            F
          </div>
          <div>
            <div className="text-2xl font-black tracking-[-0.08em]">FINA.</div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.22em]">
              Money, in focus
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <FinaBadge tone="sky">Personal finance / Clear</FinaBadge>
          <h1 className="mt-6 text-7xl font-black uppercase leading-[0.82] tracking-[-0.08em] xl:text-8xl">
            See every move.
          </h1>
          <p className="mt-8 max-w-xl text-lg font-semibold leading-7 text-fina-ink/70">
            Import statements, organize transactions, and keep shared money in
            one focused workspace.
          </p>
        </div>

        <div className="relative z-10 grid max-w-2xl grid-cols-3 border-l-2 border-t-2 border-fina-ink bg-fina-surface shadow-fina-lg">
          {["Import", "Review", "Understand"].map((item) => (
            <div
              key={item}
              className="border-b-2 border-r-2 border-fina-ink p-4"
            >
              <Check className="size-4" strokeWidth={3} />
              <div className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.12em]">
                {item}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center border-2 border-fina-ink bg-fina-lime font-black shadow-fina-sm">
              F
            </div>
            <div className="text-xl font-black tracking-[-0.08em]">FINA.</div>
          </div>

          <FinaBadge tone={isSignUp ? "sky" : "lime"}>
            {isSignUp ? "New workspace member" : "Secure access"}
          </FinaBadge>
          <h2 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.065em] sm:text-5xl">
            {isSignUp ? "Create account." : "Welcome back."}
          </h2>
          <p className="mt-4 text-sm font-semibold leading-6 text-fina-ink/60">
            {isSignUp
              ? "Set up your profile and start organizing your financial workspace."
              : "Sign in to continue to your financial workspace."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error ? (
              <Alert
                variant="destructive"
                className="rounded-none border-2 border-fina-ink bg-fina-danger text-fina-ink"
              >
                <AlertDescription className="font-semibold">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}

            {isSignUp ? (
              <label className="block">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                  Name
                </span>
                <Input
                  {...register("name")}
                  className={`mt-2 ${inputClassName}`}
                  placeholder="Your name"
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name ? (
                  <p className="mt-2 text-sm font-bold text-red-700">
                    {errors.name.message}
                  </p>
                ) : null}
              </label>
            ) : null}

            <label className="block">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                Email address
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
                  {errors.email.message}
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                Password
              </span>
              <Input
                {...register("password")}
                className={`mt-2 ${inputClassName}`}
                type="password"
                placeholder="At least 6 characters"
                aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password ? (
                <p className="mt-2 text-sm font-bold text-red-700">
                  {errors.password.message}
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
                ? "Working…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight className="ml-auto" />
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-0.5 flex-1 bg-fina-ink" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fina-ink/50">
                Or continue with
              </span>
              <div className="h-0.5 flex-1 bg-fina-ink" />
            </div>

            <Button
              type="button"
              variant="fina-secondary"
              className="h-12 w-full"
              onClick={() => signInWithGoogle()}
            >
              <FcGoogle className="size-5" />
              Google
            </Button>
          </form>

          <div className="mt-7 border-t-2 border-fina-ink pt-5 text-center">
            <Button variant="fina-ghost" onClick={toggleMode}>
              {isSignUp
                ? "Already have an account? Sign in"
                : "New to Fina? Create an account"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
