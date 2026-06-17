# Supabase backend for Mobilo

The hosted database is the **source of truth**. Schema changes are applied
through Supabase migrations (in `supabase/migrations/`) and synced from the
hosted project via the Supabase MCP server / CLI.

The legacy single-file `schema.sql` in this folder has been superseded by
the timestamped migration files. Don't edit it for new changes — use a new
migration instead.

## Workflow

To make schema changes:

1. Use the Supabase MCP `apply_migration` tool (preferred) or write a new
   `supabase/migrations/<timestamp>_<name>.sql` file
2. Run advisors (`get_advisors` MCP tool) and address any security/perf flags
3. Regenerate TypeScript types into `src/types/database.ts`
4. Update application code (`src/services/*.ts`, contexts) accordingly

## Project info

- Project ref: `pjmloilxdeceyurqgvlu`
- Project name: `Mobilo_Auth`
- Region: South Asia (Mumbai)
- URL: https://pjmloilxdeceyurqgvlu.supabase.co

## Tables

- `public.profiles` - 1:1 with `auth.users`, auto-created on user signup via
  the `on_auth_user_created` trigger.
- `public.bookings` - per-user booking history, RLS scoped to owner.

## Auth

The app uses Supabase Phone OTP auth (Option A in the design doc). The
SMS provider is configured in the Supabase dashboard:
**Authentication → Providers → Phone**.

For India, the recommended setup is to enable Phone provider and route SMS
through an Indian provider (MSG91 / 2Factor) using a **Send SMS Hook** so
you keep Indian SMS pricing and reliability while Supabase still owns the
session and JWT.
