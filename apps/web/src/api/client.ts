import supabase from "@/supabaseClient"
import { webEnvironment } from "@/env"
import { OpenAPI } from "./generated"

OpenAPI.BASE = webEnvironment.VITE_API_URL.replace(/\/$/, "")
OpenAPI.TOKEN = async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession()
  return session?.access_token ?? ""
}
