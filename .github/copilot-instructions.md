# Copilot / AI Agent Instructions for Trackerfinanciero

Purpose: provide concise, actionable information so an AI agent can be productive immediately in this repo.

## Quick summary
  - `src/hooks/useFinanceData.ts` - Core transactions, categories, payment methods
  - `src/hooks/useBudgetsData.ts` - Budget management and tracking
  - `src/hooks/useLoans.ts` + `useLoansLogic.ts` - Loan management (debts & credits)
  - `src/hooks/useSavingsData.ts` + `useSavingsLogic.ts` - Savings goals and tracking
  - `src/hooks/usePaymentMethods.ts` - Payment method operations
  - Context providers: `FinanceContext.tsx`, `LoansContext.tsx`, `SavingsContext.tsx`


## Where to look first (key files)

### Core Data Hooks

### Context & State Management

### Authentication & Security

### UI & Pages

### Configuration & Types


## Architecture & important patterns

### Modular Hook Architecture
  - Core finance operations: `useFinanceData.ts`, `useFinanceLogic.ts`
  - Domain-specific: `useBudgetsData.ts`, `useLoans.ts`, `useSavingsData.ts`, `usePaymentMethods.ts`
  - Logic hooks: `useLoansLogic.ts`, `useSavingsLogic.ts` (business logic separated from data fetching)
  - `FinanceContext` → exposes `useFinance()` hook
  - `LoansContext` → exposes `useLoansContext()` hook
  - `SavingsContext` → exposes `useSavingsContext()` hook

### Database & Security
  - All reads/writes filter by `user.id` (e.g., `.eq('user_id', user.id)`)
  - Modifying queries **must preserve RLS filtering**
  - Update types when schema changes (regenerate from Supabase CLI or manually)

### Real-time Updates
  - `useFinanceData` subscribes to `transactions` table
  - `useBudgetsData` subscribes to `budgets` table
  - `useLoans` subscribes to `loans` table
  - `useSavingsData` subscribes to `savings_goals` table

### State Management Patterns

### Additional Tables & Features
  - RPC: `approve_invoice(p_invoice_id)` converts pending invoice to transaction

### Error Handling


## Developer workflows & commands


## Project-specific conventions and gotchas


## Typical edits & examples

### Adding a column/table
1. Add a migration under `supabase/migrations/` with descriptive name (format: `YYYYMMDDHHMMSS_description.sql`)
2. Update `src/integrations/supabase/types.ts` (regenerate with Supabase CLI or manually add types)
3. Reflect new fields in the appropriate hook (e.g., `useFinanceData`, `useBudgetsData`, `useLoans`, etc.)
4. Update any components that consume the modified data

### Adding a new feature

### UI text updates

### Working with contexts


## Testing & debugging tips
  - Start dev server and use the web UI to exercise flows (login via magic link, add transactions, transfer, import Excel, etc.).
  - Use Supabase dashboard to inspect tables and RLS policies.
  - Check `console.log` and errors produced by Supabase calls (`error` is checked and surfaced to the user via toast).


## Safety & consistency notes (do not change unless intentional)


## Additional Resources

### Key Features by Module

### Common Patterns


If anything here is unclear or you want explicit examples/templates for common tasks (add migration + code, add new hook function, update types), tell me which area to expand and I will iterate. ✅

La única documentación de referencia obligatoria para el theme base y lineamientos visuales es:

- [README_TEMAS.md](../../README_TEMAS.md)

Elimina cualquier referencia a otros documentos de instrucciones. Toda la información de theme, tipografía, colores y accesibilidad está centralizada en ese archivo.

Para cualquier ajuste visual, consulta y sigue exclusivamente lo definido en README_TEMAS.md.
