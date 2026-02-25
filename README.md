# FinTrack - Rastreador Financiero Personal

Aplicación financiera robusta para seguimiento de ingresos, gastos, presupuestos y proyecciones de flujo de caja.

## Estado del Proyecto
✅ **Validado y Verificado**
La aplicación ha pasado por una verificación exhaustiva de UI/UX y lógica financiera.

## Guía del Proyecto y Funcionalidades

### 1. Gestión Financiera (Core)
- **Transacciones:** Ingresos, Gastos, Transferencias. Validaciones estrictas.
- **Tarjetas de Crédito:**
    - Manejo inteligente de cuotas.
    - 1 cuota = Gasto inmediato.
    - >1 cuota = Proyección mensual en Flujo de Caja.
- **Ahorros e Inversiones:** Secciones dedicadas con cálculo de rendimientos.

### 2. Flujo de Caja (Cash Flow)
- **Proyección:** Algoritmo que conecta el balance actual con obligaciones futuras.
- **Gastos Futuros:** Módulo para agendar pagos únicos o suscripciones recurrentes.
- **Lógica Temporal:**
    - Pasado: Se basa en transacciones reales.
    - Futuro: Se basa en presupuestos y gastos programados.
    - Mes Actual: Híbrido (Real + Restante de Presupuesto).

### 3. Analítica e Insights
- **Integración Mixpanel:** Rastreo de eventos clave para métricas de retención y salud financiera.
- **Insights Financieros:** Panel de sugerencias basado en patrones de gasto.

### 4. UI/UX y Diseño
- **Diseño Premium:** Estética limpia, sombras suaves, bordes sutiles.
- **Gráficos Unificados:** Estilos visuales consistentes (colores, ejes, grids) en todos los gráficos (Evolución, Flujo de Caja, Gastos).
- **Sistema de Colores:** Pool interno de 40 colores, limitado a 10 opciones visibles para el usuario.
- **Componentes:**
    - Tablas con alineación perfecta.
    - Botones con estados interactivos claros.
    - Skeletons personalizados para evitar saltos visuales (Layout Shift).

### 5. Presupuestos
- Creación de presupuestos mensuales por categoría.
- Alertas automáticas de desvío.
- Lista detallada de seguimiento de ejecución presupuestal.

## Solicitudes Cumplidas (Historial de Cambios)

### ✅ Cumplido Totalmente
- **Validación UI:** Botones pequeños, tablas consistentes, skeletons fieles.
- **Lógica Financiera:** Corrección de flujo de caja, manejo de tarjetas y suscripciones.
- **Gráficas:**
    - Histórica: Back-calculation correcto.
    - Futura: Proyección continua desde saldo real.
- **Responsividad:** Adaptable a Móvil (Barra de navegación inferior) y Desktop (Sidebar lateral).
- **Orden Visual:** Tarjetas de presupuesto ordenadas lógicamente.

### ✅ Actualizaciones Recientes
- **Importación Excel:** Mecanismo robusto con validación de tipos y manejo de errores.
- **Optimización de UI:** Eliminación de componentes redundantes en Presupuestos para mejorar UX.
- **Fixes de Tipado:** Corrección estricta de errores TypeScript en gráficos y contextos.
- **Integración Gmail Avanzada:**
    - Búsqueda con rango de fechas y filtros de estado (Leídas/Aprobadas).
    - Feedback instantáneo (Optimistic UI) al conectar/desconectar.
    - Lógica de selección inteligente (excluye facturas ya aprobadas).
- **Calidad de Código:**
    - Implementación de 10 reglas estrictas de Linter (ESLint).
    - Limpieza de deuda técnica en módulos críticos (`Loans`, `Settings`).
- **Refactor de Transferencias:** Actualización de la firma de `addTransfer` para usar objetos, mejorando la mantenibilidad y resolviendo errores en la página de Ahorros.
- **Alineación Visual:** Ajustes estructurales en encabezados y tarjetas para garantizar una alineación perfecta sin hacks de CSS.

### ✅ 2026-02-23 — Seguridad & Bug Fixes
- **Fix: Préstamo duplicado** — `Loans.tsx` ahora usa `isSubmitting` guard que deshabilita el botón "Guardar" durante la operación async, previniendo doble-clic o red lenta que generaba 2 registros.
- **Fix: TypeScript** — Declarado estado faltante `reviewViewByMessageId` en `AdvancedSettings.tsx` que causaba error de compilación.
- **Migración DB** (`20260223_loans_unique_and_data_masking.sql`):
  - `UNIQUE(user_id, name)` en tabla `loans` — rechaza duplicados a nivel de BD como segunda línea de defensa.
  - Vista `user_configs_masked` — enmascara `gmail_tokens`, `gemini_api_key`, `telegram_bot_token` como `***CONFIGURED***` en consultas SQL directas (los datos ya están cifrados AES-256-CBC por el backend).
  - Columnas de auditoría `gemini_key_updated_at`, `telegram_token_updated_at`, `gmail_tokens_updated_at` + trigger de rotación automática.
- **Cifrado de credenciales confirmado** — `encryption.service.js` cifra todos los tokens con AES-256-CBC + IV aleatorio por registro + clave derivada por usuario vía `scrypt`. Los datos en `user_configs` nunca son texto plano.

## 🚀 Hoja de Ruta (Roadmap) & Próximos Pasos

Consulta el documento [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) para ver el plan detallado de mejoras críticas, incluyendo internacionalización, modo offline, y optimizaciones de seguridad.

## 🧪 Pruebas y QA

La aplicación cuenta con una suite de pruebas robusta que garantiza la estabilidad de las funcionalidades críticas.

### Ejecución de Pruebas

```bash
# Ejecutar todas las pruebas
npm run test

# Ejecutar pruebas en modo UI (interactivo)
npm run test:ui

# Ejecutar pruebas y generar reporte de cobertura
npm run coverage
```

### Infraestructura de Despliegue (Render)

La aplicación está configurada para desplegarse automáticamente en **Render** mediante el archivo `render.yaml`:
- **Frontend:** Estático alojado desde la carpeta `dist_deploy`.
- **Backend:** Servicio Node.js ejecutado desde la carpeta `backend`.
- **Base de Datos:** Integración nativa con Supabase.

### Estructura de Pruebas

- **Unitarias (`src/features/**/utils/*.test.ts`)**: Validan la lógica de negocio pura, como cálculos de flujo de caja y formateadores.
- **Integración (`src/test/integration/*.test.tsx`)**: Validan la interacción entre componentes y hooks en las páginas principales (`Dashboard`, `History`, `Loans`, `Savings`).
- **Configuración**:
    - `vitest.config.ts`: Configuración principal de Vitest.
    - `src/test/setup.ts`: Mocks globales y configuración del entorno de pruebas.

## Estructura del Código

### Directorios Principales

#### `/src/features` (Feature-First Architecture)
Organización por dominio funcional. Cada feature es autocontenida:

- **`auth/`**: Autenticación, login, protecciones de ruta.
- **`finance/`**: Núcleo financiero.
    - `components/`: UI específica de finanzas (tablas, cards).
    - `hooks/`: Lógica de negocio (`useFinanceData`, `useBudgetsData`, `useLoans`, `useSavingsData`).
    - `context/`: `FinanceContext`, `LoansContext`, `SavingsContext`.
    - `utils/`: Helpers financieros (`financeUtils`).
    - `types/`: Definiciones TypeScript (`Transaction`, `Budget`, etc.).
- **`dashboard/`**: Vistas de resumen y widgets principales.
- **`settings/`**: Configuración de usuario y preferencias.

#### `/src/shared` (Shared Kernel)
Componentes y utilidades reutilizables en toda la app:

- **`ui/`**: Componentes base de shadcn/ui (Button, Card, Dialog, etc.).
- **`components/`**: Componentes compuestos reutilizables (`ErrorBoundary`, `MoneyInput`).
    - `skeletons/`: Loaders visuales.
- **`hooks/`**: Hooks genéricos (`use-toast`, `use-mobile`, `useScrollRestoration`).
- **`layouts/`**: Estructuras de página (`MainLayout`, `Sidebar`, `MobileNav`).

#### `/src/core`
Lógica transversal de la aplicación:
- **`api/`**: Query keys y configuraciones.
- **`utils/`**: Utilidades generales (`cn`, `dateUtils`, `analytics`).

#### `/src/integrations`
- `supabase/`: Cliente y tipos generados automáticamente.
- `excel/`: Lógica de importación/exportación.

#### `/src/pages`
Puntos de entrada de rutas (ahora más delgados, delegando a features):
- `Index.tsx`, `History.tsx`, `Budgets.tsx`, `CashFlow.tsx`, `Savings.tsx`, `Loans.tsx`.

---

## Convenciones de Código

### Nomenclatura
- **Componentes**: PascalCase (`TransactionList.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useFinanceData.ts`)
- **Utilidades**: camelCase (`formatCurrency.ts`)
- **Tipos**: PascalCase (`Transaction`, `PaymentMethod`)
- **Constantes**: UPPER_SNAKE_CASE (`CURRENCIES`, `DEFAULT_COLOR`)

### Organización de Archivos
- Un componente por archivo
- Tipos específicos en el mismo archivo del componente
- Tipos compartidos en `hooks/financeTypes.ts`
- Un hook por archivo

### Imports
- Usar alias `@/` para todos los imports internos
- Orden: React → Third-party → Internal → Types → Styles
- Agrupar imports relacionados

**Ejemplo**:
```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction } from '@/hooks/financeTypes';
```

### Componentes
- Preferir functional components con hooks
- Usar `memo()` para componentes que renderizan listas grandes
- Extraer lógica compleja a custom hooks
- Props interfaces siempre explícitas

**Ejemplo**:
```typescript
interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TransactionList = memo(function TransactionList({
  transactions,
  onEdit,
  onDelete
}: TransactionListProps) {
  // ...
});
```

### Estado
- **Estado local**: `useState`
- **Estado compartido**: Context API
- **Estado del servidor**: Supabase con real-time subscriptions
- **Formularios**: `react-hook-form` + `zod`

---

## Cómo Agregar Nuevas Features

### 1. Crear Estructura de Feature

```bash
src/features/[feature-name]/
├── components/
│   ├── [FeatureName]List.tsx
│   ├── Add[FeatureName]Dialog.tsx
│   └── Edit[FeatureName]Dialog.tsx
├── hooks/
│   └── use[FeatureName]Data.ts
└── types/
    └── [featureName]Types.ts  # Opcional si son tipos muy específicos
```

### 2. Crear Hook de Datos

Seguir patrón de `useFinanceData`:
- Incluir subscripciones real-time si aplica
- Manejar loading y error states
- Exportar métodos CRUD

**Ejemplo**:
```typescript
export function useFeatureData() {
  const [data, setData] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch inicial
  useEffect(() => {
    fetchData();
  }, []);
  
  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('features')
      .on('postgres_changes', { ... }, handleChange)
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, []);
  
  const addFeature = async (feature: Omit<Feature, 'id'>) => {
    // ...
  };
  
  return { data, loading, addFeature };
}
```

### 3. Crear Componentes

- Usar componentes UI de `@/components/ui`
- Seguir patrones de diseño existentes (cards, dialogs, tables)
- Crear skeleton específico en `@/components/common/skeletons`

### 4. Agregar Página

1. Crear en `src/pages/[FeatureName].tsx`
2. Agregar ruta en `App.tsx`:
   ```typescript
   <Route path="/feature" element={<FeatureName />} />
   ```
3. Agregar navegación en `Sidebar.tsx` y `MobileNav.tsx`

### 5. Actualizar Documentación

- Agregar descripción en este README
- Documentar nuevos hooks si son complejos
- Actualizar `ARCHITECTURE.md` si hay decisiones técnicas importantes
- Actualizar `THEME_CONTEXT.md` si hay cambios visuales

---

## Documentación Adicional

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura técnica detallada
- **[THEME_CONTEXT.md](./THEME_CONTEXT.md)** - Guía de diseño visual y tema
- **[TESTS_BACKLOG.md](./docs/tests-backlog.md)** - Banco de pruebas E2E y Unitarias (incluye escenarios Gmail).

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

---

# Instrucciones Técnicas y Guía para AI (Copilot)

**Purpose:** Provide concise, actionable information for AI agents & developers.

## Quick Summary
- `src/features/finance/hooks/useFinanceData.ts` - Core transactions, categories, payment methods
- `src/features/finance/hooks/useBudgetsData.ts` - Budget management
- `src/features/finance/loans/hooks/useLoans.ts` - Loan management
- `src/features/finance/hooks/useSavingsData.ts` - Savings goals
- `src/features/finance/context/` - Context providers (`FinanceContext`, `LoansContext`, `SavingsContext`)

## Architecture & Important Patterns

### Feature-Based Architecture
- **Features**: Self-contained modules in `src/features/[feature-name]`
- **Shared**: Common UI and logic in `src/shared`
- **Core**: App-wide configuration in `src/core`

### Modular Hook Architecture
- Logic separated from UI components.
- State management via Context API + React Query (TanStack Query) patterns where applicable.

### Database & Security
- All reads/writes filter by `user.id` (e.g., `.eq('user_id', user.id)`)
- Modifying queries **must preserve RLS filtering**
- Update types when schema changes (regenerate from Supabase CLI or manually)
- **RLS** is enabled on all tables with `WITH CHECK (auth.uid() = user_id)` — full CRUD protection
- **Credential encryption**: `encryption.service.js` uses AES-256-CBC with per-user scrypt-derived key. Never store tokens as plain text.
- **Data masking view**: `user_configs_masked` — use this for any frontend SQL inspection; base table is for backend (service_role) only.
- **Unique constraints**: `loans(user_id, name)` prevents duplicate loan creation at DB level.

### Real-time Updates
- `useFinanceData` subscribes to `transactions` table
- `useBudgetsData` subscribes to `budgets` table
- `useLoans` subscribes to `loans` table
- `useSavingsData` subscribes to `savings_goals` table

## Typical Edits & Examples

### Adding a column/table
1. Add a migration under `supabase/migrations/` with descriptive name (format: `YYYYMMDDHHMMSS_description.sql`)
2. Update `src/integrations/supabase/types.ts` (regenerate with Supabase CLI or manually add types)
3. Reflect new fields in the appropriate hook (e.g., `useFinanceData`, `useBudgetsData`, `useLoans`, etc.)
4. Update any components that consume the modified data

## Testing & Debugging Tips
- Start dev server and use the web UI to exercise flows (login via magic link, add transactions, transfer, import Excel, etc.).
- Use Supabase dashboard to inspect tables and RLS policies.
- Check `console.log` and errors produced by Supabase calls (`error` is checked and surfaced to the user via toast).

## Documentación de Tema y Diseño
La única documentación de referencia obligatoria para el theme base y lineamientos visuales es:

- [THEME_CONTEXT.md](./THEME_CONTEXT.md)
- [TESTS_BACKLOG.md](./docs/tests-backlog.md)

Toda la información de theme, tipografía, colores y accesibilidad está centralizada en ese archivo.
Para cualquier ajuste visual, consulta y sigue exclusivamente lo definido en `THEME_CONTEXT.md`.
