# Contexto del Sistema de Temas (Theme Context)

La aplicación utiliza un sistema de **theming dinámico** basado en un único color base (`baseColor`), que se procesa matemáticamente para generar una paleta completa de colores HSL.

## 🎨 Lógica Principal

### 1. Estado Global
El color base se gestiona en el hook `useFinanceData`:
```typescript
const [baseColor, setBaseColor] = useState(DEFAULT_BASE_COLOR); // e.g., '#64748b'
const [themeVars, setThemeVars] = useState<Record<string, string>>(() => calculateProportionalTheme(DEFAULT_BASE_COLOR));
```

### 2. Conversión Hex -> HSL
Existe una función `hexToHSL(hex: string)` que convierte el color hexadecimal seleccionado por el usuario a sus componentes HSL (Matiz, Saturación, Luminosidad).

### 3. Generación Proporcional (`calculateProportionalTheme`)
A partir del `baseColor`, se calculan dinámicamente las variables CSS. No se usan paletas estáticas hardcodeadas para los derivados, sino cálculos matemáticos sobre el HSL del color base.

**Variables generadas:**
-   `--primary`: El color base principal.
-   `--accent-primary`: Igual al primary (usado para CTAs).
-   `--accent-soft`: Versión suavizada (menor saturación, mayor luminosidad) para hovers/fondos.
-   `--accent-soft-bg`: Fondo muy sutil.
-   `--accent-soft-border`: Bordes decorativos.
-   `--details-*, --sidebar-*`: Derivados consistentes.

### 4. Accesibilidad (WCAG)
El sistema incluye utilidades para validar el contraste automáticamente (`validateThemeContrast`), asegurando cumplimiento WCAG AA/AAA.
-   **Texto sobre fondo:** Se verifica contra blanco (`#ffffff`).
-   **Bordes:** Se verifica contra fondos de tarjeta.

**Reporte de Accesibilidad:**
Se puede obtener un reporte completo en consola:
```typescript
import { getThemeAccessibilityReport } from '@/hooks/useFinanceData';
console.table(getThemeAccessibilityReport());
```

## 🧪 Testing y Debugging

### Página de Prueba
Existe una ruta dedicada para validar visualmente los temas:
-   **URL:** `/theme-test` (e.g. `http://localhost:8081/theme-test`)
-   **Componente:** `src/components/ThemePreviewTest.tsx`
-   **Funcionalidad:** Muestra una grid con los 4 temas principales y sus métricas de contraste en tiempo real.

### Transiciones
Se aplican transiciones CSS de **0.3s** (`transition-all duration-300`) en cambios de color para evitar cambios bruscos.

## 📂 Archivos Clave
-   **Lógica:** `src/hooks/useFinanceData.ts` (Funciones `calculateProportionalTheme`, `hexToHSL`, `validateThemeContrast`).
-   **Estilos Base:** `src/index.css` (Definición de variables CSS default y clases de transición).
-   **Componente Test:** `src/components/ThemePreviewTest.tsx`.

## 🛠️ Uso

## 📏 Lineamientos Visuales Estrictos (Strict Design System)

Este proyecto se rige por un **Contexto Global de Diseño** que debe respetarse en cada implementación.

### 1. Sistema de Colores dinámico
-   **Primary Variable:** El color `primary` es un token, NUNCA un valor fijo.
-   **Prohibido hardcodear:** No usar colores hex directos para elementos principales. Usar siempre `bg-primary`, `text-primary`, etc.
-   **Contraste Dinámico (Crítico):**
    -   El texto sobre fondo `primary` debe calcularse dinámicamente (`foreground`).
    -   Nunca asumir que el texto debe ser blanco. Si el primary es muy claro, el texto debe ser oscuro.
    -   **Hover:** El contraste no debe disminuir.

### 2. Formularios (Patrón Visual)
-   **Contenedor:** Fondo blanco, borde suave, sombra ligera.
-   **Inputs:** Altura homogénea, fondo blanco, borde neutro. Focus = Borde Primary.
-   **Botones:**
    -   **Principal:** Fondo Primary. Texto calculado. Hover variante del primary.
    -   **Secundario:** Fondo neutro. No competir con primary.

### 3. Tablas (Patrón Visual)
-   **Contenedor:** Card blanca.
-   **Encabezados:** Fondo neutro, texto gris oscuro.
-   **Filas:** Fonde blanco. Hover gris muy claro (sin alterar texto).
-   **Acciones:** Iconos neutros, hover primary visible.

### 4. Reglas Críticas UI/UX
-   **Botones Pequeños:** Texto e iconos NUNCA invisibles en hover.
-   **Fondos:** El fondo general de la app (`bg-muted/30` o similar) debe diferenciarse del fondo de las Cards (`bg-card` / blanco).
-   **Consistencia:** El cambio de tema no debe romper la jerarquía visual ni la legibilidad.
