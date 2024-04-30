import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase_types";

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  "https://ljspexmqldypsgxdkcfj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqc3BleG1xbGR5cHNneGRrY2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg4MjY2MTgsImV4cCI6MjAyNDQwMjYxOH0.el5wsZrma5Ur3L32CuanMRCSR_wr39J_6pQLTO34i-o",
);
