export $(grep -v '^#' .env | xargs)
npx supabase gen types typescript --project-id "ljspexmqldypsgxdkcfj" --schema public > src/supabase/supabase_types.ts