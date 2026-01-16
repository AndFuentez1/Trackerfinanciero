# Copilot / AI Agent Instructions for Trackerfinanciero

Purpose: provide concise, actionable information so an AI agent can be productive immediately in this repo.

## Quick summary
- Frontend single-page app built with **Vite + React + TypeScript**, UI from **shadcn-ui** and **Radix**.
- Backend is **Supabase** (hosted project id in `supabase/config.toml`). The app uses the Supabase JS client directly from the browser (`src/integrations/supabase/client.ts`).
- Central data access layer is the custom hook `src/hooks/useFinanceData.ts` — most DB reads/writes, real-time subscriptions, and derived summaries live here.
- Auth is handled with Supabase magic links (OTP) via `src/hooks/useAuth.ts`.

---

## Where to look first (key files)
- Data & business logic: `src/hooks/useFinanceData.ts` (transactions, budgets, payment methods, categories, seeding, summary calculations, real-time sync)
- Authentication: `src/hooks/useAuth.ts` (OTP via `supabase.auth.signInWithOtp`, session handling)
- Supabase config & types: `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` (typed DB schema)
- UI & components: `src/components/*` and `src/components/finance/*` (many examples of using hooks + types). Note: **Métodos de pago** management is exposed in `src/pages/Configuracion.tsx` (Settings) as a dedicated section — add/edit/delete payment methods and balances are handled there (removed from top-level header buttons). 
- DB migrations: `supabase/migrations/*` (table schema + RLS policies)
- Project scripts: `package.json` (dev/build/preview/lint)

---

## Architecture & important patterns
- Single-page React app where hooks are the service layer: components call hooks (e.g., `useFinanceData`) which handle all Supabase queries and state updates.
- Data model is multi-tenant via `user_id` + Supabase Row-Level Security (RLS). All reads/writes in hooks filter by `user.id` (e.g., `.eq('user_id', user.id)`). Modifying queries must preserve RLS filtering.
- Database typing is included in `src/integrations/supabase/types.ts` and the Supabase client is instantiated as `createClient<Database>(...)` — update these types when schema changes.
- Real-time updates: `useFinanceData` subscribes to `transactions` and `budgets` via `supabase.channel(...).on('postgres_changes', ...)` and triggers `fetchData()` on changes.
- Many functions both mutate the DB and immediately update local state (optimistic-ish updates). Some flows rely on the realtime subscription to fully refresh state (e.g., transfers and balance updates).
- Error handling uses `toast` (see `src/hooks/use-toast.ts`) with user-facing messages in Spanish across the app.

---

## Developer workflows & commands
- Install & run dev server: `npm i` then `npm run dev` (Vite dev server)
- Build for production: `npm run build` and preview with `npm run preview`.
- Lint: `npm run lint` (ESLint configured via `eslint.config.js`)
- Database migrations are included under `supabase/migrations/`. Apply them using the Supabase CLI (e.g., `supabase` commands) or via the Supabase dashboard for the hosted project (project id in `supabase/config.toml`).

---

## Project-specific conventions and gotchas
- Language: UI and toast messages are written in **Spanish** — keep messages consistent when adding UI text.
- Path alias: `@/*` maps to `./src/*` (see `tsconfig.json`) — prefer `@/` imports.
- Category seeding: the frontend **does not** auto-seed categories. If `categories` is empty for a user, the app leaves it empty and the user must create the first category via the UI (do not create default categories in code).
- Category uniqueness: the DB should enforce **UNIQUE(user_id, name)** so users can reuse category names across users but not duplicate them within the same account. If adding category-related migrations, include a unique constraint migration (see `supabase/migrations/`) and prefer `upsert()` in hooks when creating categories to avoid duplicate rows.
- Transfers create two transactions (out/in) and manually update payment method balances. Be careful if changing this flow: both transactions and `payment_methods.balance` must remain consistent.
- `supabase` keys: `src/integrations/supabase/client.ts` contains a comment "Ponemos los valores directamente para desbloquear la app" and the publishable key is embedded for the demo app. If switching to a private/staging environment, move secrets to environment variables and update client initialization.

---

## Typical edits & examples
- Add a column/table:
  1. Add a migration under `supabase/migrations/`.
  2. Update `src/integrations/supabase/types.ts` (or regenerate the types) and reflect new fields in `useFinanceData` (fetch/mapping) and any components that consume them.
- Add a new feature (e.g., savings reports): prefer adding business logic to `useFinanceData` and exporting derived data via `useMemo` (consistent with existing patterns).
- To update UI text, search for Spanish strings in `src/pages/*` and `src/components/*` to stay consistent.

---

## Testing & debugging tips
- There are no automated unit tests in the repo. Manual testing strategy:
  - Start dev server and use the web UI to exercise flows (login via magic link, add transactions, transfer, import Excel, etc.).
  - Use Supabase dashboard to inspect tables and RLS policies.
  - Check `console.log` and errors produced by Supabase calls (`error` is checked and surfaced to the user via toast).
- If you encounter weird state after DB migrations, refresh the client by calling `fetchData()` or restarting the app — realtime channels will also trigger refetch.

---

## Safety & consistency notes (do not change unless intentional)
- Preserve `.eq('user_id', user.id)` filters and RLS policy assumptions when changing queries or adding raw SQL.
- Realtime subscription names and filters are important: `supabase.channel('schema-db-changes')...` triggers global refetches; if you add subscription logic, make sure to clean up with `supabase.removeChannel(channel)`.

---

If anything here is unclear or you want explicit examples/templates for common tasks (add migration + code, add new hook function, update types), tell me which area to expand and I will iterate. ✅
