import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"
import { webEnvironment } from "./env"

const supabaseUrl = webEnvironment.VITE_SUPABASE_URL
const supabaseKey = webEnvironment.VITE_SUPABASE_KEY
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export default supabase
