# Copilot / AI Agent Instructions for Trackerfinanciero

Purpose: provide concise, actionable information so an AI agent can be productive immediately in this repo.

## Quick summary
- Frontend single-page app built with **Vite + React + TypeScript**, UI from **shadcn-ui** and **Radix**.
- Backend is **Supabase** (hosted project id in `supabase/config.toml`). The app uses the Supabase JS client directly from the browser (`src/integrations/supabase/client.ts`).
- **Modular architecture**: Business logic is now separated into specialized hooks and context providers:
  - `src/hooks/useFinanceData.ts` - Core transactions, categories, payment methods
  - `src/hooks/useBudgetsData.ts` - Budget management and tracking
  - `src/hooks/useLoans.ts` + `useLoansLogic.ts` - Loan management (debts & credits)
  - `src/hooks/useSavingsData.ts` + `useSavingsLogic.ts` - Savings goals and tracking
  - `src/hooks/usePaymentMethods.ts` - Payment method operations
  - Context providers: `FinanceContext.tsx`, `LoansContext.tsx`, `SavingsContext.tsx`
- Auth is handled with Supabase magic links (OTP) via `src/hooks/useAuth.ts`.

---

## Where to look first (key files)

### Core Data Hooks
- **Transactions & Categories**: `src/hooks/useFinanceData.ts` (transactions, categories, seeding, summary calculations, real-time sync)
- **Budgets**: `src/hooks/useBudgetsData.ts` (budget CRUD, tracking, notifications)
- **Loans**: `src/hooks/useLoans.ts` + `src/hooks/useLoansLogic.ts` (loan management, payments, calculations)
- **Savings**: `src/hooks/useSavingsData.ts` + `src/hooks/useSavingsLogic.ts` (savings goals, contributions, progress tracking)
- **Payment Methods**: `src/hooks/usePaymentMethods.ts` (payment method operations)

### Context & State Management
- `src/contexts/FinanceContext.tsx` - Global finance state (transactions, categories, payment methods)
- `src/contexts/LoansContext.tsx` - Loans state management
- `src/contexts/SavingsContext.tsx` - Savings state management

### Authentication & Security
- `src/hooks/useAuth.ts` (OTP via `supabase.auth.signInWithOtp`, session handling)
- `src/hooks/useInactivityLogout.ts` (auto logout on inactivity)

### UI & Pages
- Main pages: `src/pages/Index.tsx` (dashboard), `Budgets.tsx`, `Loans.tsx`, `Savings.tsx`, `History.tsx`, `Configuracion.tsx` (settings)
- **Settings**: `src/pages/Configuracion.tsx` contains payment methods management (add/edit/delete methods and balances)
- Components: `src/components/*` and `src/components/finance/*`
- Mobile navigation: `src/components/MobileNav.tsx`, responsive hook: `src/hooks/use-mobile.tsx`

### Configuration & Types
- Supabase config & types: `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` (typed DB schema)
- Finance types: `src/hooks/financeTypes.ts` (shared type definitions)
- Finance constants: `src/hooks/financeConstants.ts` (constant values, defaults)
- Finance utilities: `src/hooks/financeUtils.ts` (helper functions)
- DB migrations: `supabase/migrations/*` (table schema + RLS policies)
- Project scripts: `package.json` (dev/build/preview/lint)

---

## Architecture & important patterns

### Modular Hook Architecture
- **Separation of concerns**: Business logic is split into specialized hooks for better maintainability
  - Core finance operations: `useFinanceData.ts`, `useFinanceLogic.ts`
  - Domain-specific: `useBudgetsData.ts`, `useLoans.ts`, `useSavingsData.ts`, `usePaymentMethods.ts`
  - Logic hooks: `useLoansLogic.ts`, `useSavingsLogic.ts` (business logic separated from data fetching)
- **Context providers** wrap the app and provide global state via React Context:
  - `FinanceContext` → exposes `useFinance()` hook
  - `LoansContext` → exposes `useLoansContext()` hook
  - `SavingsContext` → exposes `useSavingsContext()` hook
- Components consume contexts rather than hooks directly in most cases

### Database & Security
- **Multi-tenant data model** via `user_id` + **Supabase Row-Level Security (RLS)**
  - All reads/writes filter by `user.id` (e.g., `.eq('user_id', user.id)`)
  - Modifying queries **must preserve RLS filtering**
- **Database typing**: `src/integrations/supabase/types.ts` — Supabase client instantiated as `createClient<Database>(...)`
  - Update types when schema changes (regenerate from Supabase CLI or manually)

### Real-time Updates
- Real-time subscriptions via `supabase.channel(...).on('postgres_changes', ...)`:
  - `useFinanceData` subscribes to `transactions` table
  - `useBudgetsData` subscribes to `budgets` table
  - `useLoans` subscribes to `loans` table
  - `useSavingsData` subscribes to `savings_goals` table
- Tables with realtime enabled: `transactions`, `budgets`, `loans`, `savings_goals`, `pending_invoices`, `future_expenses`
- Subscriptions trigger `fetchData()` or similar to refresh state on DB changes

### State Management Patterns
- **Optimistic updates**: Many functions mutate DB and immediately update local state
- Some flows rely on realtime subscription to fully refresh state (e.g., transfers, balance updates)
- **React Query** is used for some data fetching (`@tanstack/react-query`) but most data flows through custom hooks

### Additional Tables & Features
- **pending_invoices**: Store future/recurring expenses waiting for approval
  - RPC: `approve_invoice(p_invoice_id)` converts pending invoice to transaction
- **future_expenses**: Planned/scheduled expenses
- **loans**: Debt and credit tracking with payments and interest calculations

### Error Handling
- Uses `toast` (see `src/hooks/use-toast.ts`) with user-facing messages in **Spanish** across the app
- Supabase errors are caught and surfaced to users via toast notifications

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

### Adding a column/table
1. Add a migration under `supabase/migrations/` with descriptive name (format: `YYYYMMDDHHMMSS_description.sql`)
2. Update `src/integrations/supabase/types.ts` (regenerate with Supabase CLI or manually add types)
3. Reflect new fields in the appropriate hook (e.g., `useFinanceData`, `useBudgetsData`, `useLoans`, etc.)
4. Update any components that consume the modified data

### Adding a new feature
- For finance-related features: add logic to `useFinanceData` or `useFinanceLogic`
- For domain-specific features: create or extend specialized hooks (`useBudgetsData`, `useLoans`, `useSavingsData`)
- For new data domains: consider creating a new context provider + hook pattern (follow `LoansContext` / `SavingsContext` examples)
- Export derived data via `useMemo` for performance (consistent with existing patterns)

### UI text updates
- Search for Spanish strings in `src/pages/*` and `src/components/*` to stay consistent
- All user-facing text must be in Spanish
- Toast messages should be descriptive and user-friendly

### Working with contexts
- To add global state: extend existing context provider or create new one
- Follow pattern: Context Provider → custom hook (`use[Domain]Context`) → components consume hook
- Example: `LoansContext.tsx` provides `useLoansContext()` which components call instead of `useLoans()` directly

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
- Realtime subscription names and filters are important: channels like `'schema-db-changes'` trigger global refetches; if you add subscription logic, make sure to clean up with `supabase.removeChannel(channel)`.
- When creating new hooks or contexts, follow existing patterns for consistency (see `LoansContext` and `SavingsContext` as templates).
- Payment method transfers create two transactions and update balances atomically - be careful modifying this flow.

---

## Additional Resources

### Key Features by Module
- **Finance Core**: Transactions, categories, payment methods, Excel import/export, transfers
- **Budgets**: Monthly budget tracking, category-based budgets, overspending alerts
- **Loans**: Debt and credit management, payment tracking, interest calculations
- **Savings**: Savings goals, progress tracking, contributions, yield estimates
- **Invoices**: Pending invoices (future expenses), approval workflow via RPC

### Common Patterns
- **Data fetching**: Each domain hook has a `fetchData()` function called on mount and after mutations
- **Real-time sync**: Subscriptions refresh data automatically when DB changes
- **Error handling**: Wrap Supabase calls in try-catch, log errors, show Spanish toast messages
- **Type safety**: Use TypeScript interfaces from `financeTypes.ts` and Supabase generated types

---

If anything here is unclear or you want explicit examples/templates for common tasks (add migration + code, add new hook function, update types), tell me which area to expand and I will iterate. ✅
