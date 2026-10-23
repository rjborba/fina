import { ApiError } from "@/api/generated"
import { i18n, localizeMessage } from "."

/** Keep provider diagnostics out of the UI; use stable Supabase Auth codes. */
export function authErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error ? error.code : null
  switch (code) {
    case "invalid_credentials":
      return "Invalid email or password."
    case "email_not_confirmed":
      return "Confirm your email before signing in."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please try again later."
    case "user_already_exists":
    case "email_exists":
      return "This email is already registered."
    case "weak_password":
      return "Password must be at least 6 characters"
    default:
      return "Unable to sign in. Please try again."
  }
}

/** API codes stay language-neutral. Only known public messages are translated. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return localizeMessage(apiErrorKey(error, fallback))
}

/** Store this key in form state so existing errors follow language changes. */
export function apiErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  const body = error.body as { code?: unknown; message?: unknown } | null
  if (body?.code === "DUPLICATE_IMPORT")
    return "This exact file has already been imported into the selected account."
  if (
    typeof body?.message === "string" &&
    i18n.exists(body.message, { lng: "en" })
  )
    return body.message
  const messages: Record<string, string> = {
    AUTHENTICATION_REQUIRED: "Please sign in again.",
    FORBIDDEN: "You do not have permission to perform this action.",
    RESOURCE_NOT_FOUND: "This resource is not available.",
    INVALID_REQUEST: "Check the required fields and try again.",
    VALIDATION_FAILED: "Check the required fields and try again.",
    RATE_LIMITED: "Too many attempts. Please try again later.",
    CONFLICT: "This change conflicts with existing data.",
    INTERNAL_ERROR: "Something went wrong"
  }
  return typeof body?.code === "string"
    ? (messages[body.code] ?? fallback)
    : fallback
}
