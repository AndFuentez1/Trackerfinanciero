# Reporte de Auditoría QA - Responsividad Móvil

**Fecha:** 20/01/2026
**QA:** AI Agent
**Dispositivo Objetivo:** Mobile First (iPhone/Android Viewports)

## Resumen Ejecutivo
La aplicación cuenta con una base sólida de diseño responsive gracias al uso de Tailwind CSS. Sin embargo, existen problemas críticos de usabilidad en dispositivos móviles, especialmente en la visualización de datos tabulares (Historial) y en el área de seguridad (Safe Areas) para la navegación móvil. Los elementos interactivos tienden a ser más pequeños de lo recomendado para interfaces táctiles.

---

## 1. Navegación Global (Sidebar & MobileNav)

### Problema Detectado
- **Safe Area Insets:** La clase `pb-safe` se utiliza en `MobileNav.tsx` pero no parece estar configurada en `tailwind.config.ts`. En iPhones con botón de inicio virtual (Barra inferior), el menú se superpondrá con la barra del sistema.
- **Tamaño de Texto:** Los textos de los ítems de menú tienen `text-[10px]`, lo cual es legible pero fatigante y puede ser difícil de acertar para usuarios con dedos grandes si el área de toque no se expande más allá del icono.

### Causa Probable
- Falta de plugin `tailwindcss-safe-area` o definición de utilidad personalizada.
- Diseño optimizado para aprovechar espacio vertical sacrificando accesibilidad.

### Severidad: **Alta** (Afecta usabilidad básica en iOS)

### Solución Técnica
1. Instalar `tailwindcss-safe-area` o definir manualmente la utilidad `.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`.
2. Aumentar el área de toque de los enlaces (`Link`) en `MobileNav` usando padding extra, aunque visualmente se mantenga compacto.

---

## 2. Pestaña Historial (HistoryPage)

### Problema Detectado
- **Corte de Tabla (Clipping):** El componente `TransactionList` envuelve la tabla en un `div` con `overflow-hidden` (Línea 240). Esto, combinado con una tabla de 7 columnas fijas, provocará que las columnas de la derecha (Monto, Acciones) sean invisibles en pantallas estrechas (< 768px). No hay scroll horizontal habilitado claramente en el contenedor padre inmediato de la tabla para este caso.
- **Filtros:** La barra de filtros usa `overflow-x-auto`. Es funcional pero puede ocultar filtros activos si el usuario no intuye que debe hacer scroll horizontal.
- **Inputs en Edición:** Los inputs dentro de la tabla en modo edición tienen anchos fijos (`w-[9rem]`) que romperán el layout en celdas estrechas.

### Causa Probable
- Uso de `table-auto` sin un contenedor `overflow-x-auto` adecuado o estrategia de "Card View" para móviles.
- Diseño Desktop-first trasladado directamente a móvil.

### Severidad: **Critica** (Impide ver o gestionar transacciones en móvil)

### Solución Técnica (Prioridad Mobile-First)
- **Transformación CSS:** Ocultar la `<table>` en móviles (`hidden md:table`) y renderizar una lista de "Tarjetas de Transacción" (`block md:hidden`). Cada tarjeta debe mostrar la información apilada verticalmente:
  - Fila 1: Icono Categoría + Descripción + Monto
  - Fila 2: Fecha + Método de Pago
  - Acciones accesibles mediante un botón de "Más opciones" o swipe.
- **Alternativa Rápida:** Cambiar `overflow-hidden` por `overflow-x-auto` en el contenedor de la tabla, aunque la UX de scroll horizontal es inferior.

---

## 3. Diálogos (AddPaymentMethodDialog / AddTransactionDialog)

### Problema Detectado
- **Touch Targets Pequeños:** Los inputs tienen `h-9` (36px). El estándar mínimo recomendado por Apple/Google es 44px-48px para evitar toques erróneos.
- **Selectores de Color:** Los botones de color en `AddPaymentMethod` son de `h-8` (32px), demasiado pequeños para interacción táctil cómoda.
- **Botones de Tipo:** Los botones de selección de tipo (Efectivo, Débito...) tienen `text-xs` en algunos breakpoints, dificultando la lectura rápida.

### Causa Probable
- Uso de las variantes `sm` o por defecto de shadcn/ui que son más compactas, ideales para desktop pero no para touch.

### Severidad: **Media** (Funcional pero frustrante)

### Solución Técnica
- Modificar las clases de los inputs y botones a `h-10` o `h-11` en pantallas móviles (`h-11 md:h-9`).
- Aumentar el tamaño de los "swatches" de color a `h-10 w-10` mínimo.

---

## 4. Pestaña Presupuestos (BudgetsPage)

### Problema Detectado
- **Grid Layout:** El grid `grid-cols-1 md:grid-cols-2` funciona correctamente.
- **Posible Overflow en Header:** El header tiene `flex items-center justify-between`. Si la fecha de "Última modificación" es larga o el título es largo, podría colisionar con el botón de "Añadir Presupuesto" en pantallas muy estrechas (ej. iPhone SE).

### Causa Probable
- `flex-row` sin `flex-wrap` o control de ancho mínimo.

### Severidad: **Baja**

### Solución Técnica
- Permitir `flex-wrap` en el header o ocultar la "Última modificación" en móviles (`hidden sm:block`).

---

## Plan de Acción Recomendado

1. **Hotfix Historial:** Implementar vista de Tarjetas para transacciones en móvil. Es el cambio de mayor impacto.
2. **Global CSS:** Añadir utilidades de `safe-area`.
3. **Refactor UI:** Aumentar alturas de inputs y botones en todos los diálogos (`h-11`).
4. **Validación:** Probar flujos de creación/edición con simulación de eventos táctiles.
