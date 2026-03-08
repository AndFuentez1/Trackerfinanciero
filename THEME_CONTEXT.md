# Contexto del Sistema de Temas (Theme Context)

La aplicación utiliza un sistema de **theming dinámico** basado en un único color base (`baseColor`), que se procesa matemáticamente para generar una paleta completa de colores HSL. **Nunca se usan paletas estáticas hardcodeadas** para los colores derivados.

---

## 🎨 Lógica Principal

### 1. Estado Global del Tema

El color base se gestiona a través del hook `useTheme` (`src/features/finance/hooks/useTheme.ts`), que actúa como interfaz pública del sistema:

```typescript
// useTheme.ts — interfaz pública
const { baseColor, setBaseColor, themeVars } = useTheme();
```

Internamente, `useFinanceData` (`src/features/finance/hooks/useFinanceData.ts`) inicializa el estado y gestiona la persistencia del color en el perfil del usuario.

### 2. Conversión Hex → HSL

La función `hexToHSL(hex: string)` (en `src/features/finance/utils/themeCalculations.ts`) convierte el color hexadecimal seleccionado por el usuario a sus componentes HSL (Matiz, Saturación, Luminosidad).

### 3. Generación Proporcional (`calculateProportionalTheme`)

Ubicada en `src/features/finance/utils/themeCalculations.ts`. A partir del `baseColor`, calcula dinámicamente las variables CSS del tema.

**Variables generadas:**

| Variable CSS | Descripción |
|---|---|
| `--primary` | Color base principal |
| `--accent-primary` | Igual al primary (usado para CTAs) |
| `--accent-soft` | Versión suavizada (menor saturación, mayor luminosidad) — hovers/fondos |
| `--accent-soft-bg` | Fondo muy sutil |
| `--accent-soft-border` | Bordes decorativos |
| `--details-*` | Colores de detalle derivados |
| `--sidebar-*` | Colores del sidebar derivados |

### 4. Runtime Application (`themeRuntime.ts`)

`src/features/finance/utils/themeRuntime.ts` aplica las variables calculadas al DOM inyectándolas en el `document.documentElement`. Esto permite que los cambios de tema sean instantáneos y no requieran re-renders.

### 5. Accesibilidad (WCAG)

El sistema incluye `validateThemeContrast` (en `themeCalculations.ts`) para validar el contraste automáticamente, asegurando cumplimiento WCAG AA/AAA.

- **Texto sobre fondo:** Se verifica contra blanco (`#ffffff`).
- **Bordes:** Se verifica contra fondos de tarjeta.

Reporte completo en consola:

```typescript
import { getThemeAccessibilityReport } from '@/features/finance/utils/themeCalculations';
console.table(getThemeAccessibilityReport());
```

---

## 🧪 Testing y Debugging

### Página de Prueba

| Campo | Valor |
|---|---|
| **URL** | `/theme-test` (e.g. `http://localhost:5173/theme-test`) |
| **Componente** | `src/components/ThemePreviewTest.tsx` |
| **Funcionalidad** | Grid con los 4 temas principales y métricas de contraste en tiempo real |

### Transiciones

Se aplican transiciones CSS de **0.3 s** (`transition-all duration-300`) en cambios de color para evitar cambios bruscos.

---

## 📂 Archivos Clave

| Archivo | Responsabilidad |
|---|---|
| `src/features/finance/utils/themeCalculations.ts` | `calculateProportionalTheme`, `hexToHSL`, `validateThemeContrast` |
| `src/features/finance/utils/themeRuntime.ts` | Aplicación de vars CSS al DOM |
| `src/features/finance/hooks/useTheme.ts` | Hook público del tema |
| `src/features/finance/hooks/useFinanceData.ts` | Estado global, persistencia |
| `src/index.css` | Variables CSS default, clases de utilidad |
| `src/styles/tokens.css` | Design tokens base |

---

## 📏 Lineamientos Visuales Estrictos (Design System)

### 1. Sistema de Colores Dinámico

- **Primary Variable:** El color `primary` es un token, NUNCA un valor fijo.
- **Prohibido hardcodear:** No usar colores hex directos para elementos principales. Usar siempre `bg-primary`, `text-primary`, `border-primary`, etc.
- **Contraste Dinámico (Crítico):**
  - El texto sobre fondo `primary` debe calcularse dinámicamente (`foreground`).
  - Nunca asumir que el texto debe ser blanco. Si el primary es muy claro, el texto debe ser oscuro.
  - **Hover:** El contraste no debe disminuir.

### 2. Formularios (Patrón Visual)

- **Contenedor:** Fondo `card`, borde suave, sombra ligera.
- **Inputs:** Altura homogénea (`h-10`), fondo `card`, borde neutro. Focus = Borde Primary.
- **Botones:**
  - **Principal:** Fondo `primary`. Texto calculado. Hover variante del primary.
  - **Secundario:** Fondo neutro. No competir con primary.

### 3. Tablas (Patrón Visual)

- **Contenedor:** Card blanca.
- **Encabezados:** Fondo neutro, texto gris oscuro.
- **Filas:** Fondo blanco. Hover gris muy claro (sin alterar texto).
- **Acciones:** Iconos neutros, hover primary visible.

### 4. Reglas Críticas UI/UX

- **Botones pequeños:** Texto e iconos NUNCA invisibles en hover.
- **Fondos:** El fondo general de la app (`bg-muted/30` o similar) debe diferenciarse del fondo de las Cards (`bg-card` / blanco).
- **Consistencia:** El cambio de tema no debe romper la jerarquía visual ni la legibilidad.
- **Font sizes de descripción:** `text-[15px]` estandarizado en todas las descripciones e informativos de configuración.

---

## 🎭 Sistema de Animación de Skeleton

Toda la lógica de carga visual está estandarizada en `src/shared/components/skeletons/`.

### Keyframes Definidos (inline via `<style>`)

| Keyframe | Descripción | Duración |
|---|---|---|
| `skeleton-shimmer` | Cambio suave de `background-color` entre opacidades de `rgba(148,163,184)`. **No cambia `opacity` del elemento.** | `2s ease-in-out` |
| `text-breathe` | Transición de color de texto entre `foreground` y `muted-foreground`. | `2s ease-in-out` |
| `bounce-wave` | Onda sinusoidal: `0%→0, 25%→-7px, 50%→0, 75%→+7px, 100%→0`. Sin piso artificial. | `1.5s ease-in-out` |

### Indicador Flotante ("Píldora")

Los tres puntos usan `.animate-bounce-sync` con delays escalonados en T/3 = 0.5 s:

| Punto | Delay | Pico en |
|---|---|---|
| Punto 1 | `animation-delay: -0.75s` | t = 0.0 s |
| Punto 2 | `animation-delay: -0.25s` | t = 0.5 s |
| Punto 3 | `animation-delay: -1.25s` | t = 1.0 s |

Esto garantiza la ola secuencial **1 → 2 → 3** perfectamente visible.

### Clases CSS

```css
.skeleton-pulse       { animation: skeleton-shimmer 2s ease-in-out infinite; }
.text-breathe         { animation: text-breathe 2s ease-in-out infinite; }
.animate-bounce-sync  { animation: bounce-wave 1.5s ease-in-out infinite; }
```

### Archivos de Skeleton

| Archivo | Uso |
|---|---|
| `SkeletonLoader.tsx` | Skeleton principal — variantes por página (`dashboard`, `transactions`, `budgets`, `loans`, `savings`, `config`, `auth`, `onboarding`) |
| `AdaptiveSkeleton.tsx` | Skeleton contextual según tipo de vista |
| `PremiumSkeleton.tsx` | Pantalla completa de carga inicial |
