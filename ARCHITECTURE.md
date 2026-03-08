# Arquitectura del Proyecto — FinTrack

## Visión General

FinTrack es una aplicación de gestión financiera personal construida con:

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui (Radix UI) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Estado | Context API + TanStack Query |
| Analytics | Mixpanel |

---

## Arquitectura Feature-First

### Principios de Organización

El proyecto sigue una **arquitectura Feature-First** donde cada funcionalidad es autocontenida y modular.

```
src/
├── features/          # Features autocontenidas (auth, finance, dashboard, settings)
├── shared/            # Código compartido entre features
├── core/              # Lógica transversal (utils, api, hooks globales)
├── integrations/      # Servicios externos (Supabase client y tipos)
├── lib/               # Helpers de producto (analytics, schemas Zod)
├── pages/             # Puntos de entrada de rutas auxiliares
├── styles/            # Design tokens CSS
├── App.tsx
├── main.tsx
└── index.css
```

---

## Estructura de Archivos Actualizada

```
src/
├── features/
│   ├── auth/
│   │   ├── components/          # LoginForm, GoogleButton, etc.
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useInactivity.ts
│   │   │   └── useAuthGuard.ts
│   │   └── pages/
│   │       └── Auth.tsx
│   │
│   ├── finance/
│   │   ├── budgets/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── cashflow/
│   │   │   ├── components/
│   │   │   ├── hooks/           # useCashFlow
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── categories/
│   │   │   └── components/
│   │   ├── components/          # Componentes financieros genéricos
│   │   ├── constants/           # currencyConstants, financeConstants, etc.
│   │   ├── context/
│   │   │   └── FinanceContext.tsx
│   │   ├── hooks/               # Todos los hooks de finanzas
│   │   │   ├── useFinanceData.ts          # Entry point / composición
│   │   │   ├── useFinanceDataLogic.ts     # Cálculos complejos de estado
│   │   │   ├── useFinanceMutations.ts     # Inserts / Updates / Deletes en Supabase
│   │   │   ├── useFinanceQueries.ts       # Selects / Subscriptions
│   │   │   ├── useFinanceUI.ts            # Estado UI (modals, tabs, selects)
│   │   │   ├── useTheme.ts                # Hook público del sistema de temas
│   │   │   ├── useProfileManagement.ts   # Perfil, región, datos de usuario
│   │   │   ├── useTransactionData.ts      # Datos y filtros de transacciones
│   │   │   ├── useBudgetsData.ts          # Presupuestos mensuales
│   │   │   ├── useLoansLogic.ts           # Lógica de préstamos
│   │   │   ├── useSavingsData.ts          # Datos de ahorros
│   │   │   ├── useSavingsLogic.ts         # Lógica de ahorros e inversiones
│   │   │   ├── useUserConfig.ts           # Gemini API key, Telegram, configs
│   │   │   ├── useFormatCurrency.ts       # Formateo de moneda contextual
│   │   │   └── useDecimalPlaces.ts        # Configuración de decimales
│   │   ├── loans/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   │   └── LoansContext.tsx
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── payment-methods/
│   │   │   └── components/
│   │   ├── savings/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   │   └── SavingsContext.tsx
│   │   │   └── pages/
│   │   ├── transactions/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── utils/
│   │   ├── types/
│   │   │   └── financeTypes.ts
│   │   └── utils/
│   │       ├── cashflowUtils.ts          # Helpers del cashflow
│   │       ├── financeCalculations.ts    # Cálculos financieros puros
│   │       ├── financeUtils.ts           # Formateo y utilidades generales
│   │       ├── localCache.ts             # Cache local de queries
│   │       ├── themeCalculations.ts      # hexToHSL, calculateProportionalTheme, WCAG
│   │       ├── themeRuntime.ts           # Aplicación de theme vars al DOM
│   │       └── transactionMappers.ts     # Mapeo de DTOs ↔ modelos de dominio
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── EvolutionChart.tsx
│   │   │   ├── SankeyChart.tsx
│   │   │   ├── ExpenseChart.tsx
│   │   │   ├── ChartSeriesToggles.tsx
│   │   │   └── ...
│   │   └── pages/
│   │       └── Dashboard.tsx
│   │
│   └── settings/
│       ├── components/             # ThemeSection, CurrencySection, etc.
│       ├── hooks/
│       └── pages/
│           └── Settings.tsx
│
├── shared/
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── GlobalErrorBoundary.tsx
│   │   ├── MoneyInput.tsx
│   │   ├── PageHeader.tsx
│   │   ├── charts/               # ChartSeriesToggles compartido
│   │   └── skeletons/
│   │       ├── SkeletonLoader.tsx
│   │       ├── AdaptiveSkeleton.tsx
│   │       └── PremiumSkeleton.tsx
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-mobile.tsx
│   │   ├── useScrollRestoration.ts
│   │   ├── useDebugInfo.ts
│   │   └── useSEO.ts
│   ├── layouts/
│   │   ├── MainLayout.tsx         # Layout protegido, verifica sesión
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   └── ui/                        # Componentes shadcn/ui (Radix primitives)
│
├── core/
│   ├── api/
│   │   └── queryKeys.ts           # TanStack Query key factory
│   ├── hooks/
│   │   └── (hooks transversales)
│   ├── types/                     # Tipos globales compartidos
│   └── utils/
│       ├── cn.ts                  # Merge de clases Tailwind
│       ├── dateUtils.ts           # Helpers de fechas (date-fns)
│       ├── analytics.ts           # Wrapper de Mixpanel
│       └── onboardingGate.ts      # Lógica del gate de onboarding
│
├── integrations/
│   └── supabase/
│       ├── client.ts              # Singleton del cliente Supabase
│       └── types.ts               # Tipos autogenerados por Supabase CLI
│
├── lib/
│   ├── analytics.ts               # Eventos de analytics del producto
│   ├── mixpanel-shim.ts          # Shim para SSR / testing
│   └── schemas.ts                 # Schemas Zod reutilizables
│
├── pages/
│   ├── BudgetsPageWithBudgetList.tsx
│   ├── NotFound.tsx
│   └── Placeholder.tsx
│
├── styles/
│   └── tokens.css                 # Design tokens CSS base
│
├── App.tsx                        # Router, Providers, Error Boundary
├── main.tsx                       # Entry point
└── index.css                      # Tailwind + variables CSS + animaciones skeleton
```

---

## Patrones de Diseño

### 1. Custom Hooks — Separación de Responsabilidades

El dominio `finance` aplica una separación explícita en sus hooks:

| Hook | Responsabilidad |
|---|---|
| `useFinanceData` | Composición / entry point — expone el estado público |
| `useFinanceQueries` | Fetch y subscripciones realtime desde Supabase |
| `useFinanceMutations` | Inserts, updates, deletes contra Supabase |
| `useFinanceDataLogic` | Cálculos financieros derivados del estado |
| `useFinanceUI` | Estado de UI (modals abiertos, tabs activas, etc.) |
| `useTheme` | Hook público del sistema de theming dinámico |
| `useProfileManagement` | Perfil, región, tratamiento de datos |
| `useTransactionData` | Datos y filtros de transacciones |
| `useBudgetsData` | Presupuestos (fetch + mutaciones) |
| `useLoansLogic` | Cálculos de amortización y préstamos |
| `useSavingsLogic` | Cálculos de ahorros e interés compuesto |
| `useUserConfig` | Config de usuario (Gemini, Telegram, etc.) |
| `useFormatCurrency` | Formateo de moneda contextual al perfil |
| `useDecimalPlaces` | Configuración de cifras decimales |

### 2. Context + Hooks Pattern

Estado global accesible sin prop drilling.

```typescript
// Provider Tree (App.tsx)
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <FinanceProvider>
      <LoansProvider>
        <SavingsProvider>
          <App />
        </SavingsProvider>
      </LoansProvider>
    </FinanceProvider>
  </AuthProvider>
</QueryClientProvider>

// Consumer
const { transactions, addTransaction } = useFinance();
const { loans } = useLoans();
```

**Contextos activos:**

| Context | Archivo | Scope |
|---|---|---|
| `AuthContext` | `features/auth/context/AuthContext.tsx` | Sesión, usuario |
| `FinanceContext` | `features/finance/context/FinanceContext.tsx` | Estado financiero principal |
| `LoansContext` | `features/finance/loans/context/LoansContext.tsx` | Préstamos y deudas |
| `SavingsContext` | `features/finance/savings/context/SavingsContext.tsx` | Ahorros e inversiones |

### 3. Compound Components (shadcn/ui)

Componentes complejos con sub-componentes relacionados.

- `Card` → `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
- `Dialog` → `DialogTrigger`, `DialogContent`, `DialogHeader`
- `Table` → `TableHeader`, `TableBody`, `TableRow`, `TableCell`

**Ubicación**: `src/shared/ui/`

---

## Flujo de Datos

### 1. Autenticación

```
User Action (email / Google)
  ↓
Supabase Auth (Magic Link / Google OAuth)
  ↓
Session Created
  ↓
AuthContext Updated
  ↓
MainLayout (Protected — verifica sesión en cada render)
  ↓
App Routes
```

### 2. Datos Financieros

```
Component
  ↓
useFinance() Hook  →  FinanceContext
  ↓
useFinanceQueries() — Supabase SELECT + Realtime subscription
  ↓
State Update en Context
  ↓
useFinanceDataLogic() — Cálculos derivados (memoizados)
  ↓
Component Re-render
```

### 3. Mutaciones

```
User Action (e.g., Agregar Transacción)
  ↓
Component llama addTransaction()
  ↓
useFinanceMutations.ts — valida con Zod
  ↓
Supabase Insert / Update
  ↓
Optimistic UI Update (inmediato)
  ↓
Realtime Event → useFinanceQueries confirma sync
  ↓
Toast Notification
```

### 4. Sistema de Temas

```
Usuario selecciona color en Settings
  ↓
setBaseColor(hex) — useTheme
  ↓
calculateProportionalTheme(hex) — themeCalculations.ts
  ↓
applyThemeToDOM(vars) — themeRuntime.ts
  ↓
CSS vars actualizadas en document.documentElement
  ↓
UI actualiza sin re-render de componentes
  ↓
persistThemeToProfile(hex) — useProfileManagement.ts
```

---

## Seguridad (Defense in Depth)

### 1. Row Level Security (RLS) — Capa de BD

Todas las tablas tienen RLS habilitado con políticas `WITH CHECK`:

```sql
CREATE POLICY "Users can update their own loans"
ON public.loans FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Tablas protegidas:** `loans`, `loan_payments`, `transactions`, `categories`, `payment_methods`, `profiles`, `savings_accounts`, `savings_transactions`, `pending_invoices`, `user_configs`.

### 2. Cifrado de Credenciales — Capa de Backend

El backend (`backend/encryption.service.js`) cifra todos los tokens sensibles:

- **Algoritmo**: AES-256-CBC
- **IV**: Aleatorio por registro (16 bytes)
- **Key derivation**: `scrypt(ENCRYPTION_KEY, userId, 32)` — clave única por usuario
- **Formato en BD**: `iv_hex:ciphertext_hex` (nunca texto plano)
- **Protegido**: `gemini_api_key`, `telegram_bot_token`, `gmail_tokens`

Variable requerida: `ENCRYPTION_KEY` en el backend Node.js.

### 3. Masked View — Capa de SQL

`user_configs_masked` enmascara el ciphertext al nivel de SQL:

```sql
CREATE VIEW public.user_configs_masked WITH (security_invoker = true) AS
SELECT
  CASE WHEN gemini_api_key IS NOT NULL THEN '***CONFIGURED***' ELSE NULL END AS gemini_api_key,
  CASE WHEN telegram_bot_token IS NOT NULL THEN '***CONFIGURED***' ELSE NULL END AS telegram_bot_token
FROM public.user_configs
WHERE auth.uid() = id;
```

### 4. Validación Dual

- **Client-side (Zod)**: schemas en `src/lib/schemas.ts` y por feature.
- **Server-side (PostgreSQL)**: `CHECK (amount > 0)`, constraints de dominio.

### 5. Privacidad de Datos

- Campo `data_treatment_accepted` en tabla `profiles`.
- Campo `country` (región) para normativas Latam/Global.
- Guard de privacidad (`DataTreatmentGuard`) en el Onboarding — bloquea el acceso hasta aceptación explícita.

### 6. Autenticación y Sesión

- **Magic Link**: Email sin contraseña.
- **Google OAuth**: Login social.
- **Session Management**: Supabase Auth con refresh automático.
- **Inactividad**: `useInactivity` rehidrata la actividad al restaurar sesión — evita logout forzado.
- **Protected Routes**: `MainLayout` verifica sesión en cada transición.

---

## Performance

### Optimizaciones Implementadas

#### 1. TanStack Query Cache

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime:    30 * 60 * 1000, // 30 minutos
    },
  },
});
```

#### 2. Optimistic Updates

```typescript
// Actualizar UI inmediatamente, sync después
setTransactions(prev => [...prev, newTransaction]);
await supabase.from('transactions').insert(newTransaction);
```

#### 3. Code Splitting

```typescript
const Loans    = lazy(() => import('./features/finance/loans/pages/Loans'));
const Savings  = lazy(() => import('./features/finance/savings/pages/Savings'));
const CashFlow = lazy(() => import('./features/finance/cashflow/pages/CashFlow'));
```

#### 4. Vite Chunking Strategy

```typescript
manualChunks(id) {
  if (id.includes('@supabase')) return 'supabase';
  if (id.includes('@radix-ui')) return 'radix';
  if (id.includes('recharts'))  return 'charts';
  if (id.includes('xlsx'))      return 'excel';
}
```

#### 5. Skeleton Screens (sin layout shift)

- `SkeletonLoader` — variantes por página: `dashboard`, `transactions`, `budgets`, `loans`, `savings`, `config`, `auth`, `onboarding`.
- `AdaptiveSkeleton` — contextual por tipo de vista.
- `PremiumSkeleton` — pantalla completa de carga inicial.

**Sistema de animación unificado** (sin `animate-pulse`, sin cambios de `opacity`):
- `skeleton-shimmer` → shimmer de fondo suave (background-color).
- `text-breathe` → respiración de color en texto.
- `bounce-wave` + delays T/3 → ola sinusoidal secuencial 1→2→3.

#### 6. Local Cache (`localCache.ts`)

Cache en memoria para queries frecuentes dentro de la misma sesión.

### Métricas Objetivo

| Métrica | Target |
|---|---|
| First Contentful Paint | < 1.5 s |
| Largest Contentful Paint | < 2.5 s |
| Time to Interactive | < 3.0 s |
| Cumulative Layout Shift | < 0.1 |
| Bundle Size (gzipped) | < 500 KB |

---

## Dependencias Clave

### Core
- `react` + `react-dom` — UI library
- `typescript` — type safety (strict mode)

### Routing
- `react-router-dom` v6

### UI
- `tailwindcss` — Utility-first CSS
- `@radix-ui/*` — Headless UI primitives
- `lucide-react` — Iconos
- `framer-motion` — Animaciones complejas

### Forms
- `react-hook-form` + `zod` + `@hookform/resolvers`

### Data
- `@supabase/supabase-js` — Backend client
- `@tanstack/react-query` — Cache y sincronización
- `date-fns` — Utilidades de fecha

### Charts
- `recharts` — Gráficos financieros (Sankey, Evolution, Expense)

### Analytics
- `mixpanel-browser` + shim propio

### Dev Tools
- `vite` + `@vitejs/plugin-react-swc`
- `vitest` + `@testing-library/react` — Testing

---

## Testing

| Nivel | Framework | Estado |
|---|---|---|
| Unit | Vitest | Activo — hooks y utilidades de finanzas |
| Integration | React Testing Library | Activo — Dashboard, History |
| E2E | Playwright | Planificado |

Ubicación de tests:
- `src/features/finance/hooks/__tests__/` — hooks de datos
- `src/features/finance/utils/__tests__/` — cálculos financieros
- `src/core/utils/__tests__/` — utilidades generales (`cn.ts`, `onboardingGate.ts`)
- `src/test/` — helpers y setup globales

---

## Nomenclatura

| Artefacto | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `TransactionList.tsx` |
| Hooks | camelCase con `use` | `useFinanceData.ts` |
| Utilidades | camelCase | `financeCalculations.ts` |
| Tipos | PascalCase | `Transaction`, `PaymentMethod` |
| Constantes | UPPER_SNAKE_CASE | `CURRENCIES`, `DEFAULT_BASE_COLOR` |

---

## Próximos Pasos

1. **E2E Testing** — Configurar Playwright para flujos críticos (login, transacciones, presupuestos).
2. **Performance** — Service Worker para offline, más code splitting en settings.
3. **Features** — Exportar PDF de reportes, notificaciones push, modo offline con sync.
4. **DevEx** — Storybook para componentes, Husky + Conventional Commits.

---

## Recursos

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Recharts](https://recharts.org/)
- [THEME_CONTEXT.md](./THEME_CONTEXT.md) — Guía de diseño visual y theming
- [CHANGELOG.md](./CHANGELOG.md) — Historial de cambios
