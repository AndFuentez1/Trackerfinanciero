# Changelog

Todas las mejoras relevantes por versión/fecha.

## [Unreleased]

### Mejoras
- Unificación de toggles de series en gráficos con `ChartSeriesToggles` para una UI más consistente y responsive.
- Reorganización de utilidades: `cashflowUtils` pasa al dominio de finanzas y `skeletonUtils` al dominio de skeletons.
- Formateo de moneda más consistente: uso de `DEFAULT_LOCALE` y `DEFAULT_CURRENCY_CODE` como fallback en componentes críticos (tooltips, cards, displays).

### Rendimiento / UX
- Skeletons con altura estable (incluye `100dvh`) para reducir layout shift.
- Ajustes de overflow/scroll en layout principal para evitar cortes/desbordes en móvil.

### Seguridad / Sesión
- Se evita el **logout forzado al entrar** por inactividad histórica: el hook de inactividad rehidrata la actividad al restaurar sesión y elimina el reload forzado.

