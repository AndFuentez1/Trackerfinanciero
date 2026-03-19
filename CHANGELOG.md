# Changelog

Todas las mejoras relevantes por versión/fecha.

---

## [2026-03-18]

### Importación y Validaciones
- **Excel Import (Deduplicación):** Se reemplazó la validación lenta por RPC con una validación local extremadamente rápida, evaluando la fecha, categoría, tipo y monto directamente contra la caché cargada.
- **Gmail Import (Gemini):** Se agregó el envío del \`Subject\` (Asunto) del correo al prompt de Gemini para mejorar la precisión de la clasificación de compras.
- **Cron Jobs y Sincronización:** Se preparó la arquitectura de endpoints de forma que Render pueda ejecutar rutinas automáticas de verificación cada 30 minutos independientemente de los clientes y se verificó que el front end no estrese y agote el endpoint innecesariamente on-load.

## [2026-03-11]

### Integración Gmail & Importación
- **Validación de Facturas**: Restaurado el título con el **Asunto del Correo** en el modal de validación para mayor contexto.
- **Soporte para Grupos**: Implementado el renderizado dinámico de "grupos" extraídos por Gemini cuando no se detectan productos individuales; ahora son editables y validables como cualquier transacción.
- **Flujo de Transferencias**: Rediseñado el layout para transferencias bancarias (Bancolombia, Nequi) con una tarjeta simplificada (Fecha, Descripción, Pago, Valor) y acción directa "Mandar a Préstamos".
- **Detección de Duplicados**: Reforzada la lógica en el RPC `find_import_duplicates` con validación estricta de descripción (case-insensitive) para evitar registros redundantes.

### UI / UX Unification
- **Sistema de Badges**: Unificado el estilo de indicadores de estado ("Conectado", "Configurado", "Verificado") en Advanced Settings (Gmail, Gemini, Telegram) usando tokens `primary` (`bg-primary/10`).
- **Toasts Estándar**: Sincronizados todos los mensajes de éxito de importación y conexión con el estándar visual de la app (✅ Emoji + Título descriptivo).
- **Advanced Settings**: Limpieza visual de labels y botones para garantizar una alineación perfecta con el theme base.

### Correcciones Técnicas
- **Tipado Estricto**: Corrección de firma en `handleApproveInvoice` para manejar transacciones de tipo `transfer` y redirigirlas correctamente al módulo de Préstamos en estado borrador.
- **Parsing de Montos**: Mejora en `parseNumberValue` para limpiar símbolos de moneda y caracteres no numéricos de forma robusta.

---

## [2026-03-07]

### Skeleton Loading — Animación Premium
- Reemplazada la animación `animate-pulse` (parpadeo por opacidad) por un shimmer de color de fondo suave (`skeleton-shimmer`) que **no cambia la transparencia** del elemento.
- Indicador de carga (píldora flotante) ya no parpadea; sus puntos rebotan en ola secuencial **1→2→3** con keyframe sinusoidal (los puntos suben *y* bajan del baseline, sin piso artificial).
- Texto "Cargando..." ahora respira en color (de `foreground` a `muted-foreground`) en sincronía con el ciclo de 2 s.
- Unificado el sistema de animaciones en los tres skeletons: `SkeletonLoader`, `AdaptiveSkeleton` y `PremiumSkeleton`.

### Dashboard — Gráficas y Tabs
- Eliminados los filtros de mes/año duplicados dentro del `EvolutionChart`; los filtros globales en el header de la sección los reemplazan.
- Igualados los contenedores de `EvolutionChart` y `SankeyChart` a una altura consistente (`min-h-[450px]` contenedor, `h-[350–400px]` gráficos internos).
- Botones de cambio de pestaña (Evolución / Flujo) reposicionados junto a los filtros globales en el header de la sección.
- `ExpenseChart` actualizado para mostrar hasta **9 categorías + "Otros"** (antes mostraba 5).
- Mensajes de estado vacío centrados correctamente en `SankeyChart` y `ExpenseChart`.

### UX — Onboarding & Selector de Monedas
- Mejoras en el Onboarding Decision Panel: distribución vertical centrada, remoción de animaciones no deseadas, y mejora en la saturación del tema Rosa.
- En la gráfica de flujo de fondos (`CashFlow`), los datos proyectados y simulados ahora exhiben puntos en los nodos de manera consistente para su legibilidad.
- Selector de monedas: filtrado y priorización por nivel de uso en Latam (COP, USD, EUR lideran la lista) y por orden alfabético para las restantes.
- Botón de recomendación rápida **"TRM de 1 de Enero de 2026" (3.757,08)** directamente desde el panel de Conversión total en configuración, exclusivo para transferencias entre USD y COP.

---

## [2026-03-04]

### Privacidad y Datos (Policies)
- Soporte en base de datos (`profiles`) para `country` (Región) y `data_treatment_accepted`.
- Implementación de guards de privacidad interactivos: revisión, aceptación o rechazo del tratamiento de datos en tiempo real.
- Integración del flujo de aceptación de política en el Onboarding (WelcomePanel), requireiendo aceptación explícita antes de continuar.

### Mejoras Generales
- Implementación de configuración de **Región y Zona de Datos**, vinculando normativas de privacidad (Latam/Global) al perfil del usuario.
- Unificación de toggles de series en gráficos con `ChartSeriesToggles` para una UI más consistente y responsive.
- Reorganización de utilidades: `cashflowUtils` y `themeCalculations` al dominio de `finance/utils/`; `skeletonUtils` eliminado del `lib/` raíz.
- Formateo de moneda más consistente: uso de `DEFAULT_LOCALE` y `DEFAULT_CURRENCY_CODE` como fallback en componentes críticos (tooltips, cards, displays).

### Rendimiento / UX
- Skeletons con altura estable (incluye `100dvh`) para reducir layout shift.
- Ajustes de overflow/scroll en layout principal para evitar cortes/desbordes en móvil.

### Seguridad / Sesión
- Se evita el **logout forzado al entrar** por inactividad histórica: el hook de inactividad rehidrata la actividad al restaurar sesión y elimina el reload forzado.

---

## [Anteriores]

Para history previo de versiones, consultar el repositorio en `.git/`.
