# Arquitectura del Proyecto - FinTrack

## Visión General

FinTrack es una aplicación de gestión financiera personal construida con:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **State**: Context API + Custom Hooks

---

## Patrones de Diseño

### 1. Feature-Based Architecture

Organización por dominio funcional en lugar de por tipo de archivo.

```
src/features/
├── auth/           # Autenticación y onboarding
├── budgets/        # Gestión de presupuestos
├── cashflow/       # Proyecciones de flujo de caja
├── categories/     # Gestión de categorías
├── dashboard/      # Vista principal y resúmenes
├── loans/          # Préstamos y deudas
├── payment-methods/# Métodos de pago
├── savings/        # Ahorros e inversiones
└── transactions/   # Transacciones y historial
```

**Ventajas**:
- ✅ **Cohesión alta**: Todo relacionado a una feature está junto
- ✅ **Acoplamiento bajo**: Features independientes
- ✅ **Escalabilidad**: Fácil agregar nuevas features
- ✅ **Mantenibilidad**: Cambios aislados por feature

### 2. Custom Hooks Pattern

Separación de lógica de negocio y presentación.

**Tipos de Hooks**:

#### Data Hooks
Fetch y mutación de datos desde Supabase.
- `useFinanceData` - Transacciones, categorías, métodos de pago
- `useBudgetsData` - Presupuestos mensuales
- `useLoans` - Préstamos y deudas
- `useSavingsData` - Ahorros e inversiones

#### Logic Hooks
Cálculos y transformaciones de datos.
- `useFinanceLogic` - Cálculos financieros
- `useCashFlow` - Proyecciones de flujo de caja
- `useLoansLogic` - Lógica de préstamos
- `useSavingsLogic` - Lógica de ahorros

#### UI Hooks
Estado y comportamiento de UI.
- `useFormatCurrency` - Formateo de moneda
- `useDecimalPlaces` - Decimales por moneda
- `useMobile` - Detección de dispositivo móvil
- `useAuth` - Estado de autenticación

### 3. Context + Hooks Pattern

Estado global accesible sin prop drilling.

```typescript
// Context Provider
<FinanceContext.Provider value={financeData}>
  <App />
</FinanceContext.Provider>

// Consumer Hook
const { transactions, addTransaction } = useFinance();
```

**Contexts Activos**:
- `FinanceContext` - Estado financiero principal
- `LoansContext` - Préstamos y deudas
- `SavingsContext` - Ahorros e inversiones

### 4. Compound Components Pattern

Componentes complejos con sub-componentes relacionados.

**Ejemplos**:
- `Card` → `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
- `Dialog` → `DialogTrigger`, `DialogContent`, `DialogHeader`
- `Table` → `TableHeader`, `TableBody`, `TableRow`, `TableCell`

---

## Flujo de Datos

### 1. Autenticación

```
User Login
  ↓
Supabase Auth (Magic Link / Google OAuth)
  ↓
Session Created
  ↓
MainLayout (Protected)
  ↓
App Routes
```

### 2. Datos Financieros

```
Component
  ↓
useFinance() Hook
  ↓
FinanceContext
  ↓
useFinanceData() Hook
  ↓
Supabase Query (.eq('user_id', user.id))
  ↓
Real-time Subscription
  ↓
State Update
  ↓
Component Re-render
```

### 3. Mutaciones

```
User Action (e.g., Add Transaction)
  ↓
Component calls addTransaction()
  ↓
Hook validates data
  ↓
Supabase Insert/Update
  ↓
Optimistic UI Update (opcional)
  ↓
Real-time Sync
  ↓
State Updated
```

---

## Decisiones Técnicas

### ¿Por qué Feature-Based Architecture?

**Alternativas consideradas**: Organización por tipo (components/, hooks/, etc.)

**Razones**:
- ✅ Mejor para aplicaciones grandes (9+ features)
- ✅ Facilita trabajo en equipo (features independientes)
- ✅ Reduce conflictos de merge
- ✅ Más fácil encontrar código relacionado

### ¿Por qué Context API en lugar de Redux?

**Razones**:
- ✅ Suficiente para este caso de uso
- ✅ Menos boilerplate
- ✅ Integración nativa con React
- ✅ No necesitamos time-travel debugging
- ✅ Real-time sync desde Supabase maneja la mayoría del estado

### ¿Por qué Supabase?

**Alternativas consideradas**: Firebase, AWS Amplify, Backend custom

**Razones**:
- ✅ Backend as a Service (menos código backend)
- ✅ Real-time out of the box
- ✅ Row Level Security (RLS) built-in
- ✅ PostgreSQL (SQL familiar, migraciones fáciles)
- ✅ Auth integrado (Magic Link, OAuth)
- ✅ Generación automática de tipos TypeScript

### ¿Por qué shadcn/ui?

**Alternativas consideradas**: Material-UI, Ant Design, Chakra UI

**Razones**:
- ✅ Componentes copiables (no npm package, full control)
- ✅ Customización total (Tailwind CSS)
- ✅ Accesibilidad built-in (Radix UI primitives)
- ✅ Tree-shakeable (solo lo que usas)
- ✅ Diseño moderno y profesional

### ¿Por qué React Hook Form + Zod?

**Razones**:
- ✅ Mejor performance (menos re-renders)
- ✅ Validación type-safe con Zod
- ✅ Integración perfecta con TypeScript
- ✅ API simple y declarativa

---

## Performance

### Optimizaciones Implementadas

#### 1. React.memo() en Listas
```typescript
export const TransactionList = memo(function TransactionList({ ... }) {
  // Evita re-renders innecesarios
});
```

#### 2. Debounce en Búsquedas
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearch(value), 300),
  []
);
```

#### 3. Optimistic Updates
```typescript
// Actualizar UI inmediatamente, sync después
setTransactions(prev => [...prev, newTransaction]);
await supabase.from('transactions').insert(newTransaction);
```

#### 4. Skeleton Screens
Evitar layout shift durante carga:
- `SkeletonLoader` con variantes por página
- `AdaptiveSkeleton` específico por feature
- Dimensiones exactas de componentes reales

#### 5. Code Splitting (Futuro)
```typescript
const Loans = lazy(() => import('./pages/Loans'));
```

### Métricas Objetivo

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 500KB (gzipped)

---

## Seguridad

### Row Level Security (RLS)

Todas las queries filtran automáticamente por `user_id`:

```sql
-- Política RLS en Supabase
CREATE POLICY "Users can only see their own data"
ON transactions
FOR ALL
USING (user_id = auth.uid());
```

**Ejemplo en código**:
```typescript
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id); // Redundante pero explícito
```

### Validación

#### Client-side (Zod)
```typescript
const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  // ...
});
```

#### Server-side (PostgreSQL)
```sql
ALTER TABLE transactions
ADD CONSTRAINT positive_amount CHECK (amount > 0);
```

### Autenticación

- **Magic Link**: Email sin contraseña
- **Google OAuth**: Login social
- **Session Management**: Supabase Auth
- **Protected Routes**: `MainLayout` verifica sesión

---

## Testing (Roadmap Futuro)

### Unit Tests
- **Framework**: Vitest
- **Cobertura**: Hooks, utilidades, cálculos financieros
- **Target**: > 80% coverage

### Integration Tests
- **Framework**: React Testing Library
- **Cobertura**: Componentes, formularios, flujos de usuario

### E2E Tests
- **Framework**: Playwright
- **Cobertura**: Flujos críticos (login, transacciones, presupuestos)

---

## Estructura de Archivos

### Convenciones

```
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── common/          # Shared components (skeletons, etc.)
│   └── layout/          # Layout components (PageHeader)
├── features/
│   └── [feature]/
│       ├── components/  # Feature-specific components
│       ├── hooks/       # Feature-specific hooks (opcional)
│       └── types/       # Feature-specific types (opcional)
├── hooks/               # Global custom hooks
├── contexts/            # Context providers
├── layouts/             # App layouts (MainLayout, Sidebar, MobileNav)
├── pages/               # Route pages
├── lib/                 # Utilities
├── integrations/        # External services (Supabase)
└── styles/              # Global styles
```

### Nomenclatura

- **Componentes**: PascalCase (`TransactionList.tsx`)
- **Hooks**: camelCase con `use` (`useFinanceData.ts`)
- **Utilidades**: camelCase (`formatCurrency.ts`)
- **Tipos**: PascalCase (`Transaction`, `PaymentMethod`)
- **Constantes**: UPPER_SNAKE_CASE (`CURRENCIES`, `DEFAULT_COLOR`)

---

## Dependencias Clave

### Core
- `react` - UI library
- `react-dom` - React renderer
- `typescript` - Type safety

### Routing
- `react-router-dom` - Client-side routing

### UI
- `tailwindcss` - Utility-first CSS
- `@radix-ui/*` - Headless UI primitives
- `lucide-react` - Icon library

### Forms
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod integration

### Data
- `@supabase/supabase-js` - Supabase client
- `date-fns` - Date utilities

### Charts
- `recharts` - Chart library

### Dev Tools
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin
- `typescript` - Type checking

---

## Próximos Pasos

### Mejoras Planificadas

1. **Testing Suite**
   - Configurar Vitest
   - Escribir tests para hooks críticos
   - E2E con Playwright

2. **Performance**
   - Implementar code splitting
   - Optimizar bundle size
   - Service Worker para offline

3. **Features**
   - Exportar PDF de reportes
   - Notificaciones push
   - Modo offline con sync

4. **DevEx**
   - Storybook para componentes
   - Husky para pre-commit hooks
   - Conventional commits

---

## Recursos

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [THEME_CONTEXT.md](./THEME_CONTEXT.md) - Guía de diseño visual
