# Arquitectura del Proyecto - FinTrack

## Visión General

FinTrack es una aplicación de gestión financiera personal construida con:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **State**: Context API + TanStack Query
- **Analytics**: Mixpanel

---

## Arquitectura Feature-First

### Principios de Organización

El proyecto sigue una **arquitectura Feature-First** donde cada funcionalidad es autocontenida y modular:

```
src/
├── features/          # Features autocontenidas
│   ├── auth/          # Autenticación y protección de rutas
│   ├── finance/       # Núcleo financiero (transacciones, presupuestos, etc.)
│   ├── dashboard/     # Vistas de resumen
│   └── settings/      # Configuración de usuario
├── shared/            # Código compartido entre features
│   ├── ui/            # Componentes base (shadcn/ui)
│   ├── components/    # Componentes reutilizables
│   ├── hooks/         # Hooks genéricos
│   └── layouts/       # Estructuras de página
├── core/              # Lógica transversal de la app
│   ├── api/           # Query keys y configuraciones
│   └── utils/         # Utilidades generales
├── integrations/      # Servicios externos
│   └── supabase/      # Cliente y tipos de Supabase
├── lib/               # Helpers y utilidades
└── pages/             # Puntos de entrada de rutas
```

### Feature: Finance (Ejemplo Detallado)

```
src/features/finance/
├── components/              # UI específica de finanzas
│   ├── cards/               # Cards de resumen
│   ├── charts/              # Gráficos financieros
│   └── tables/              # Tablas de datos
├── context/                 # Context providers
│   ├── FinanceContext.tsx   # Estado principal
│   ├── LoansContext.tsx     # Préstamos
│   └── SavingsContext.tsx   # Ahorros
├── hooks/                   # Lógica de negocio
│   ├── useFinanceData.ts    # Fetch de datos
│   ├── useFinanceDataLogic.ts # Lógica compleja
│   ├── useBudgetsData.ts    # Presupuestos
│   ├── useLoansLogic.ts     # Lógica de préstamos
│   └── useSavingsLogic.ts   # Lógica de ahorros
├── loans/                   # Sub-feature: Préstamos
│   ├── components/
│   ├── context/
│   └── hooks/
├── savings/                 # Sub-feature: Ahorros
│   ├── components/
│   ├── context/
│   └── hooks/
├── transactions/            # Sub-feature: Transacciones
│   └── components/
├── cashflow/                # Sub-feature: Flujo de caja
│   ├── components/
│   └── hooks/
├── constants/               # Constantes financieras
│   ├── currencyConstants.ts
│   └── financeConstants.ts
├── types/                   # Tipos TypeScript
│   └── financeTypes.ts
└── utils/                   # Utilidades financieras
    └── financeUtils.ts
```

**Ventajas**:
- ✅ **Cohesión alta**: Todo relacionado a finanzas está junto
- ✅ **Acoplamiento bajo**: Features independientes
- ✅ **Escalabilidad**: Fácil agregar sub-features
- ✅ **Mantenibilidad**: Cambios aislados por feature

---

## Patrones de Diseño

### 1. Custom Hooks Pattern

Separación de lógica de negocio y presentación.

**Tipos de Hooks**:

#### Data Hooks
Fetch y mutación de datos desde Supabase.
- `useFinanceData` - Transacciones, categorías, métodos de pago
- `useBudgetsData` - Presupuestos mensuales
- `useLoans` - Préstamos y deudas
- `useSavingsData` - Ahorros e inversiones

**Ubicación**: `src/features/finance/hooks/`

#### Logic Hooks
Cálculos y transformaciones de datos.
- `useFinanceDataLogic` - Cálculos financieros complejos
- `useCashFlow` - Proyecciones de flujo de caja
- `useLoansLogic` - Lógica de préstamos
- `useSavingsLogic` - Lógica de ahorros

**Ubicación**: `src/features/finance/hooks/` y sub-features

#### UI Hooks
Estado y comportamiento de UI.
- `use-toast` - Sistema de notificaciones
- `use-mobile` - Detección de dispositivo móvil
- `useScrollRestoration` - Restauración de scroll

**Ubicación**: `src/shared/hooks/`

### 2. Context + Hooks Pattern

Estado global accesible sin prop drilling.

```typescript
// Context Provider
<FinanceProvider>
  <LoansProvider>
    <SavingsProvider>
      <App />
    </SavingsProvider>
  </LoansProvider>
</FinanceProvider>

// Consumer Hook
const { transactions, addTransaction } = useFinance();
const { loans } = useLoans();
```

**Contexts Activos**:
- `FinanceContext` - Estado financiero principal (`src/features/finance/context/`)
- `LoansContext` - Préstamos y deudas (`src/features/finance/loans/context/`)
- `SavingsContext` - Ahorros e inversiones (`src/features/finance/savings/context/`)
- `AuthContext` - Autenticación (`src/features/auth/context/`)

### 3. Compound Components Pattern

Componentes complejos con sub-componentes relacionados (shadcn/ui).

**Ejemplos**:
- `Card` → `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
- `Dialog` → `DialogTrigger`, `DialogContent`, `DialogHeader`
- `Table` → `TableHeader`, `TableBody`, `TableRow`, `TableCell`

**Ubicación**: `src/shared/ui/`

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
AuthContext Updated
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
Hook validates data (Zod)
  ↓
Supabase Insert/Update
  ↓
Optimistic UI Update (opcional)
  ↓
Real-time Sync
  ↓
State Updated
  ↓
Toast Notification
```

---

## Decisiones Técnicas

### ¿Por qué Feature-First Architecture?

**Alternativas consideradas**: Organización por tipo (components/, hooks/, etc.)

**Razones**:
- ✅ Mejor para aplicaciones grandes (9+ features)
- ✅ Facilita trabajo en equipo (features independientes)
- ✅ Reduce conflictos de merge
- ✅ Más fácil encontrar código relacionado
- ✅ Permite sub-features anidadas (e.g., `finance/loans/`)

### ¿Por qué Context API + TanStack Query?

**Razones**:
- ✅ Context API para estado de UI y autenticación
- ✅ TanStack Query para cache y sincronización de datos
- ✅ Menos boilerplate que Redux
- ✅ Integración nativa con React
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

#### 2. TanStack Query Cache
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000,    // 30 minutos
    },
  },
});
```

#### 3. Optimistic Updates
```typescript
// Actualizar UI inmediatamente, sync después
setTransactions(prev => [...prev, newTransaction]);
await supabase.from('transactions').insert(newTransaction);
```

#### 4. Skeleton Screens
Evitar layout shift durante carga:
- `SkeletonLoader` con variantes por página (`src/shared/components/skeletons/`)
- `AdaptiveSkeleton` específico por feature
- Dimensiones exactas de componentes reales

#### 5. Code Splitting
```typescript
const Loans = lazy(() => import('./pages/Loans'));
const Savings = lazy(() => import('./pages/Savings'));
```

#### 6. Vite Chunking Strategy
```typescript
// vite.config.ts
manualChunks(id) {
  if (id.includes("@supabase")) return "supabase";
  if (id.includes("@radix-ui")) return "radix";
  if (id.includes("recharts")) return "charts";
  if (id.includes("xlsx")) return "excel";
}
```

### Métricas Objetivo

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 500KB (gzipped)

---

## Seguridad

### Capas de Seguridad (Defense in Depth)

El sistema implementa múltiples capas de protección independientes:

#### 1. Row Level Security (RLS) — Capa de BD

Todas las tablas tienen RLS habilitado con políticas `WITH CHECK`:

```sql
-- Política RLS con WITH CHECK en Supabase
DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;
CREATE POLICY "Users can update their own loans"
ON public.loans FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); -- Previene transfer attacks
```

Tablas protegidas: `loans`, `loan_payments`, `transactions`, `categories`, `payment_methods`, `profiles`, `savings_accounts`, `savings_transactions`, `pending_invoices`, `user_configs`.

#### 2. Cifrado de Credenciales — Capa de Backend

El backend (`encryption.service.js`) cifra todos los tokens sensibles antes de persistirlos:

- **Algoritmo**: AES-256-CBC
- **IV**: Aleatorio por registro (16 bytes)
- **Key derivation**: `scrypt(ENCRYPTION_KEY, userId, 32)` — clave única por usuario
- **Formato en BD**: `iv_hex:ciphertext_hex` (nunca texto plano)
- **Protegido**: `gemini_api_key`, `telegram_bot_token`, `gmail_tokens`

```javascript
// encryption.service.js
const key = crypto.scryptSync(ENCRYPTION_KEY, userId, 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

Variable de entorno requerida: `ENCRYPTION_KEY` en el backend Node.js.

#### 3. Masked View — Capa de SQL

`user_configs_masked` enmascara incluso el ciphertext al nivel de SQL:

```sql
CREATE VIEW public.user_configs_masked WITH (security_invoker = true) AS
SELECT
  CASE WHEN gemini_api_key IS NOT NULL THEN '***CONFIGURED***' ELSE NULL END AS gemini_api_key,
  CASE WHEN telegram_bot_token IS NOT NULL THEN '***CONFIGURED***' ELSE NULL END AS telegram_bot_token,
  -- ...
FROM public.user_configs
WHERE auth.uid() = id;
```

#### 4. Unique Constraints — Integridad de Datos

Constraints a nivel de BD que previenen duplicados incluso ante race conditions del frontend:

```sql
ALTER TABLE public.loans ADD CONSTRAINT loans_user_name_unique UNIQUE (user_id, name);
```

#### 5. Validación

##### Client-side (Zod)
```typescript
const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
});
```

##### Server-side (PostgreSQL)
```sql
ALTER TABLE transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);
```

#### 6. Autenticación

- **Magic Link**: Email sin contraseña
- **Google OAuth**: Login social
- **Session Management**: Supabase Auth
- **Protected Routes**: `MainLayout` verifica sesión

---

## Estructura de Archivos Completa

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   └── pages/
│   │       └── Auth.tsx
│   ├── finance/
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   ├── charts/
│   │   │   └── tables/
│   │   ├── context/
│   │   │   ├── FinanceContext.tsx
│   │   │   ├── LoansContext.tsx
│   │   │   └── SavingsContext.tsx
│   │   ├── hooks/
│   │   │   ├── useFinanceData.ts
│   │   │   ├── useFinanceDataLogic.ts
│   │   │   ├── useBudgetsData.ts
│   │   │   ├── useLoansLogic.ts
│   │   │   └── useSavingsLogic.ts
│   │   ├── loans/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   └── hooks/
│   │   ├── savings/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   └── hooks/
│   │   ├── transactions/
│   │   │   └── components/
│   │   ├── cashflow/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── constants/
│   │   ├── types/
│   │   └── utils/
│   ├── dashboard/
│   │   └── components/
│   └── settings/
│       └── components/
├── shared/
│   ├── ui/                  # shadcn/ui components
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── MoneyInput.tsx
│   │   ├── PageHeader.tsx
│   │   └── skeletons/
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-mobile.tsx
│   │   └── useScrollRestoration.ts
│   └── layouts/
│       ├── MainLayout.tsx
│       ├── Sidebar.tsx
│       └── MobileNav.tsx
├── core/
│   ├── api/
│   │   └── queryKeys.ts
│   └── utils/
│       ├── cn.ts
│       ├── dateUtils.ts
│       ├── analytics.ts
│       └── onboardingGate.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── analytics.ts
│   ├── cashflowUtils.ts
│   ├── currencyFormat.tsx
│   ├── mixpanel-shim.ts
│   ├── schemas.ts
│   └── skeletonUtils.ts
├── pages/
│   ├── Index.tsx
│   ├── History.tsx
│   ├── Budgets.tsx
│   ├── CashFlow.tsx
│   ├── Savings.tsx
│   └── Loans.tsx
├── styles/
│   └── tokens.css
├── App.tsx
├── main.tsx
└── index.css
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
- `framer-motion` - Animations

### Forms
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod integration

### Data
- `@supabase/supabase-js` - Supabase client
- `@tanstack/react-query` - Data fetching and caching
- `date-fns` - Date utilities

### Charts
- `recharts` - Chart library

### Analytics
- `mixpanel-browser` - Product analytics

### Dev Tools
- `vite` - Build tool
- `@vitejs/plugin-react-swc` - React plugin with SWC
- `typescript` - Type checking

---

## Testing & Validation Strategy

### Testing Roadmap

#### Unit Tests
- **Framework**: Vitest
- **Cobertura**: Hooks, utilidades, cálculos financieros
- **Target**: > 80% coverage

#### Integration Tests
- **Framework**: React Testing Library
- **Cobertura**: Componentes, formularios, flujos de usuario

#### E2E Tests
- **Framework**: Playwright
- **Cobertura**: Flujos críticos (login, transacciones, presupuestos)

---

## 🔍 Validation Checklist (Pre-Testing Phase)

> **IMPORTANTE**: Antes de implementar el testing suite, se debe realizar una validación exhaustiva del sistema completo. Esta checklist asegura que todos los aspectos críticos están correctamente implementados.

### 1. UX/UI Validation

#### Visual Consistency
- [ ] **Design System**: Todos los componentes usan tokens del sistema (`index.css`, `tokens.css`)
- [ ] **Typography**: Jerarquía consistente (h1-h6, text-base, text-sm, etc.)
- [ ] **Colors**: No hay colores hardcodeados, solo variables CSS
- [ ] **Spacing**: Uso consistente de padding/margin (p-4, p-6, gap-4, etc.)
- [ ] **Borders & Shadows**: Uso de `--border-subtle`, `--shadow-sm`, etc.

#### Responsive Design
- [ ] **Mobile First**: Todos los componentes funcionan en móvil (320px+)
- [ ] **Breakpoints**: Correcta adaptación en sm, md, lg, xl
- [ ] **Navigation**: Sidebar en desktop, MobileNav en mobile
- [ ] **Touch Targets**: Botones y links tienen mínimo 44x44px en mobile

#### Interactive States
- [ ] **Hover**: Todos los elementos interactivos tienen hover states
- [ ] **Focus**: Estados de focus visibles para accesibilidad
- [ ] **Loading**: Skeletons en todas las cargas de datos
- [ ] **Empty States**: Mensajes claros cuando no hay datos
- [ ] **Error States**: Manejo visual de errores

#### Accessibility (WCAG 2.1)
- [ ] **Contrast**: Ratio mínimo 4.5:1 para texto
- [ ] **Keyboard Navigation**: Todos los elementos accesibles por teclado
- [ ] **Screen Readers**: Labels y aria-labels correctos
- [ ] **Focus Trap**: Dialogs y modals atrapan el focus correctamente

### 2. Database & Data Integrity

#### Schema Validation
- [ ] **RLS Policies**: Todas las tablas tienen Row Level Security
- [ ] **Foreign Keys**: Relaciones correctamente definidas
- [ ] **Constraints**: CHECK constraints para validaciones (ej: amount > 0)
- [ ] **Indexes**: Índices en columnas frecuentemente consultadas
- [ ] **Triggers**: Triggers funcionan correctamente (si aplica)

#### Data Consistency
- [ ] **User Isolation**: Queries filtran por `user_id`
- [ ] **Cascade Deletes**: Eliminación de datos relacionados funciona
- [x] **Unique Constraints**: `loans(user_id, name)` — previene duplicados incluso ante race conditions
- [ ] **Default Values**: Valores por defecto correctos en columnas

#### Migrations
- [ ] **Reversible**: Todas las migraciones tienen rollback
- [ ] **Idempotent**: Migraciones pueden ejecutarse múltiples veces
- [ ] **Documented**: Cambios de schema documentados

### 3. Business Logic Validation

#### Financial Calculations
- [ ] **Currency Precision**: Todos los cálculos usan 2 decimales
- [ ] **Rounding**: Redondeo consistente (Math.round)
- [ ] **Negative Amounts**: Manejo correcto de números negativos
- [ ] **Zero Division**: Protección contra división por cero
- [ ] **Overflow**: Manejo de números muy grandes

#### Transaction Logic
- [ ] **Transfer Exclusion**: Transferencias no cuentan como ingreso/gasto
- [ ] **Credit Card Installments**: Cuotas se proyectan correctamente
- [ ] **Loan Amortization**: Cálculo francés correcto
- [ ] **Savings Yield**: Interés compuesto calculado correctamente
- [ ] **Budget Tracking**: Gasto vs presupuesto preciso

#### Cash Flow Projection
- [ ] **Pivot Date**: Separación correcta entre pasado y futuro
- [ ] **Real vs Projected**: Lógica de ingresos reales vs presupuestados
- [ ] **Future Expenses**: Suscripciones y gastos únicos proyectados
- [ ] **Balance Continuity**: Balance acumulado es continuo
- [ ] **Pending Debts**: Deudas pasadas restan correctamente

### 4. State Management

#### Context Providers
- [ ] **Provider Order**: Contextos anidados en orden correcto
- [ ] **Initial State**: Estados iniciales son seguros (no null/undefined)
- [ ] **Updates**: State updates son inmutables
- [ ] **Performance**: No re-renders innecesarios

#### Real-time Sync
- [ ] **Subscriptions**: Canales de Supabase correctamente suscritos
- [ ] **Cleanup**: Subscriptions se limpian en unmount
- [ ] **Conflict Resolution**: Manejo de actualizaciones concurrentes
- [ ] **Optimistic Updates**: UI se actualiza antes de confirmación

#### Cache Strategy (TanStack Query)
- [ ] **Stale Time**: Configurado apropiadamente (10 min)
- [ ] **Cache Time**: GC time correcto (30 min)
- [ ] **Invalidation**: Queries se invalidan cuando corresponde
- [ ] **Prefetching**: Datos críticos se precargan

### 5. Infrastructure & Performance

#### Build & Bundle
- [ ] **Build Success**: `npm run build` sin errores
- [ ] **Bundle Size**: < 500KB gzipped
- [ ] **Code Splitting**: Chunks separados por vendor
- [ ] **Tree Shaking**: Código no usado eliminado
- [ ] **Source Maps**: Generados para debugging

#### Performance Metrics
- [ ] **FCP**: First Contentful Paint < 1.5s
- [ ] **LCP**: Largest Contentful Paint < 2.5s
- [ ] **TTI**: Time to Interactive < 3s
- [ ] **CLS**: Cumulative Layout Shift < 0.1
- [ ] **FID**: First Input Delay < 100ms

#### Network & API
- [ ] **API Calls**: Minimizados (batch requests donde sea posible)
- [ ] **Error Handling**: Todos los fetch tienen try/catch
- [ ] **Retry Logic**: Reintentos en fallos de red
- [ ] **Timeout**: Timeouts configurados
- [ ] **Rate Limiting**: Respeto a límites de Supabase

### 6. Security & Privacy

#### Authentication
- [ ] **Session Validation**: Sesión verificada en cada request
- [ ] **Token Refresh**: Tokens se refrescan automáticamente
- [ ] **Logout**: Limpieza completa de estado en logout
- [ ] **Protected Routes**: Rutas protegidas redirigen a login

#### Data Protection
- [ ] **XSS Prevention**: Inputs sanitizados
- [ ] **CSRF Protection**: Tokens CSRF donde aplique
- [ ] **SQL Injection**: Queries parametrizadas (Supabase lo maneja)
- [ ] **Sensitive Data**: No se loguea información sensible

#### Client-side Validation
- [ ] **Zod Schemas**: Todos los forms tienen validación
- [ ] **Type Safety**: TypeScript strict mode activo
- [ ] **Input Sanitization**: Inputs limpios antes de enviar

### 7. Error Handling & Monitoring

#### Error Boundaries
- [ ] **Global Boundary**: ErrorBoundary en App.tsx
- [ ] **Feature Boundaries**: Boundaries en features críticas
- [ ] **Fallback UI**: UI de error amigable
- [ ] **Error Reporting**: Errores se reportan (Sentry/Mixpanel)

#### User Feedback
- [ ] **Toast Notifications**: Feedback en todas las acciones
- [ ] **Loading States**: Indicadores de carga visibles
- [ ] **Success Messages**: Confirmaciones claras
- [ ] **Error Messages**: Mensajes de error descriptivos

#### Analytics
- [ ] **Event Tracking**: Eventos críticos trackeados (Mixpanel)
- [ ] **User Properties**: Propiedades de usuario actualizadas
- [ ] **Funnel Analysis**: Funnels de conversión configurados
- [ ] **Error Tracking**: Errores se envían a analytics

### 8. Code Quality

#### TypeScript
- [ ] **No `any`**: Cero uso de `any` type
- [ ] **Strict Mode**: TypeScript strict habilitado
- [ ] **Type Coverage**: > 95% de código tipado
- [ ] **Type Imports**: Imports de tipos separados

#### Code Organization
- [ ] **Feature Isolation**: Features son independientes
- [ ] **DRY Principle**: No código duplicado
- [ ] **Single Responsibility**: Componentes/hooks con una responsabilidad
- [ ] **Naming Conventions**: Nombres descriptivos y consistentes

#### Documentation
- [ ] **README**: Actualizado con estructura actual
- [ ] **ARCHITECTURE**: Refleja implementación real
- [ ] **THEME_CONTEXT**: Guía de diseño actualizada
- [ ] **Code Comments**: Lógica compleja comentada

---

## 📋 Pre-Testing Execution Plan

Cuando se decida implementar testing, seguir este orden:

### Phase 1: Validation (1-2 días)
1. Ejecutar checklist completo de arriba
2. Documentar issues encontrados
3. Priorizar fixes críticos
4. Resolver issues bloqueantes

### Phase 2: Setup (1 día)
1. Instalar Vitest + React Testing Library
2. Configurar test environment
3. Crear helpers de testing
4. Escribir primer test de ejemplo

### Phase 3: Unit Tests (3-5 días)
1. Testear utilidades (`financeUtils`, `dateUtils`)
2. Testear hooks de cálculo (`useFinanceDataLogic`, `useCashFlow`)
3. Testear formatters (`currencyFormat`)
4. Alcanzar 80% coverage en lógica crítica

### Phase 4: Integration Tests (3-5 días)
1. Testear formularios principales
2. Testear flujos de CRUD
3. Testear interacciones de componentes
4. Testear Context providers

### Phase 5: E2E Tests (2-3 días)
1. Configurar Playwright
2. Testear flujo de login
3. Testear flujos críticos (transacciones, presupuestos)
4. Testear importación Excel

### Phase 6: CI/CD (1 día)
1. Configurar GitHub Actions
2. Ejecutar tests en cada PR
3. Bloquear merge si tests fallan
4. Generar reportes de coverage

---

## Próximos Pasos

### Mejoras Planificadas

1. **Testing Suite**
   - Configurar Vitest
   - Escribir tests para hooks críticos
   - E2E con Playwright

2. **Performance**
   - Optimizar bundle size
   - Service Worker para offline
   - Implementar más code splitting

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
- [TanStack Query](https://tanstack.com/query/latest)
- [THEME_CONTEXT.md](./THEME_CONTEXT.md) - Guía de diseño visual
- [README.md](./README.md) - Documentación del proyecto
