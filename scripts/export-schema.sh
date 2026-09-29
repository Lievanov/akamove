#!/usr/bin/env bash
#
# Exports the current Supabase project's schema (tables, views, functions,
# triggers, RLS policies) with NO data, so it can be replayed into a fresh
# Supabase project on a different account.
#
# Usage:
#   SOURCE_DB_URL="postgresql://postgres:[PASSWORD]@db.[SOURCE_REF].supabase.co:5432/postgres" \
#     ./scripts/export-schema.sh
#
# Requires the Postgres client tools (pg_dump) — install via:
#   brew install libpq && brew link --force libpq
#
# Find the connection string in:
#   Supabase Dashboard -> Project Settings -> Database -> Connection string
#   (use the "Direct connection" string, not the pooler, for pg_dump/psql)

set -euo pipefail

if [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "Error: set SOURCE_DB_URL to the source project's direct connection string." >&2
  exit 1
fi

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/api"
OUT_FILE="$OUT_DIR/db_export.sql"

echo "Dumping public schema (tables, views, functions, triggers, RLS policies)..."
pg_dump "$SOURCE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f "$OUT_FILE"

echo "Appending the auth.users trigger (not captured under --schema=public)..."
cat >> "$OUT_FILE" <<'EOF'

-- The following objects live on auth.users and are NOT captured by a
-- --schema=public dump. They must be created manually if the target
-- project needs new-user profile rows created automatically.
--
-- create function public.handle_new_user () returns trigger as $$
-- begin
--   insert into public.profiles (id, full_name, avatar_url, email)
--   values (
--     new.id,
--     new.raw_user_meta_data->>'full_name',
--     new.raw_user_meta_data->>'avatar_url',
--     new.raw_user_meta_data->>'email'
--     );
--   return new;
-- end;
-- $$ language plpgsql security definer;
--
-- create trigger on_auth_user_created
-- after insert on auth.users for each row
-- execute procedure public.handle_new_user ();
EOF

echo "Done. Schema written to $OUT_FILE"
echo ""
echo "To restore into a new Supabase project:"
echo "  psql \"postgresql://postgres:[NEW_PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres\" -f $OUT_FILE"
echo ""
echo "Then uncomment and run the auth.users trigger block above against the new project"
echo "if it needs to auto-create a profiles row on signup."
