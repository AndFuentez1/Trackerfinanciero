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

## 🚀 Hoja de Ruta (Roadmap) & Próximos Pasos

Se ha diseñado un plan para futuras mejoras críticas que optimizarán la flexibilidad y el alcance de la aplicación:

### 1. Internacionalización (i18n)
- **Selector de Idioma:** Preparación para soporte multi-idioma (Español/Inglés).
- **Localización:** Adaptación de formatos de fecha y moneda según la elección del usuario

### 2. Toggles de Funcionalidad (Feature Toggles)
- **Control de Visibilidad:** Implementación de interruptores en Configuración para mostrar/ocultar módulos específicos:
    - **Panel de Facturas Pendientes:** Opción para usuarios que prefieren un historial más limpio.
    - **Zona de Reclasificación:** Toggle para activar/desactivar la asistencia de limpieza de datos.
- **Persistencia:** Uso de `localStorage` para preferencias inmediatas, escalable a perfil de base de datos.

### 3. Aplicación Móvil y Modo Offline (Próximamente)
- **Capacitor Wrapper:** Convertir la aplicación en una APK funcional utilizando WebView con Capacitor.
- **Capacidades Offline:** Permitir el uso de la aplicación y el registro de datos sin conexión a internet.
- **Sincronización Inteligente:** Actualizar automáticamente los datos con el servidor una vez se recupere la conexión.

### 4. Gestión de Configuración
- **Portabilidad:** Opción para exportar e importar la configuración personalizada de la aplicación (temas, feature toggles, preferencias) para facilitar la migración entre dispositivos.

### 5. QA & Performance (Pendiente)
- [ ] Ejecutar Lighthouse en entorno productivo y registrar scores (Performance, Accessibility, Best Practices, SEO).
- [ ] Configurar suite de tests (Unit/Integration/E2E) y pipeline de CI.
- [ ] Revisar CLS/TTI con datasets reales y optimizar carga de módulos pesados (charts/excel).
- [ ] Auditoría de accesibilidad completa (teclado, aria-labels, contraste).
- [ ] Backlog de tests guardado en `docs/tests-backlog.md` para reactivar la suite.

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

Toda la información de theme, tipografía, colores y accesibilidad está centralizada en ese archivo.
Para cualquier ajuste visual, consulta y sigue exclusivamente lo definido en `THEME_CONTEXT.md`.
