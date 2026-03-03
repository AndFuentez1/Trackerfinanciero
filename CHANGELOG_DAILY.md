# Changelog - 2026-03-02

## Settings & Data Management
- **Borrar Datos**: Se incluyeron los préstamos en la lógica de borrado operativo y se añadió el toggle correspondiente en la UI.
- **Resetear Perfil**: Se eliminó la obligatoriedad de marcar "Eliminar perfil completo". El botón de borrado ahora se habilita si hay al menos una opción de datos seleccionada.
- **Correciones de Estado**: Se corrigió un error de dedo (`bgudgets`) en las opciones de reseteo del perfil.

## UI/UX & Aesthetics
- **Theme Flash Fix**: Se optimizó la inyección del tema en el `index.html` usando una base neutra (Slate 500) para evitar el destello inicial "teal".
- **Transiciones Controladas**: Se ajustó `index.css` y `index.html` para aplicar transiciones de color solo después de que el tema inicial se haya inyectado correctamente, eliminando saltos visuales en la carga.

# Changelog - 2026-03-01

## Traceability
- Created `CHANGELOG_DAILY.md` to track all modifications and ensure rollback capability.
- Updated internal rules to maintain this log daily.

## Correcciones y Seguimiento de Transacciones
- **Integridad de Saldo**: Se corrigió la lógica en `useFinanceMutations` para que las transferencias de entrada sumen al saldo y las de salida resten correctamente.
- **Visibilidad en Historial**: Se ajustaron los filtros en `HistoryTab` para garantizar que los abonos y pagos de préstamos (tipos `transfer_in`/`transfer_out`) sean visibles.
- **Sincronización de Préstamos**: Se añadió la invalidación de caché para que la lista de préstamos se actualice inmediatamente tras un pago.
- **UI de Historial**: El botón "Cargar más transacciones" ahora tiene un borde primario continuo y se ajustaron los hovers de los filtros.

## UI/UX Refinements
- **Load More Button**: Updated "Cargar más transacciones" in History to have a continuous primary border and primary styling.
- **Payment Methods Card**: Redesigned the "Agregar método de pago" card to start with primary colors and transition to gray on hover.
- **Status Colors**: Fixed hover behavior in loan buttons and "Acción Requerida" alert to preserve specific status foreground colors.
- **CashFlow Filters**: Verified toggle "Saldos Reales" is correctly placed in the filters section.

## Features: Préstamos y Deudas
- **Overpayment Handling**: Implemented logic to automatically create a reverse debt (lent/borrowed) when a payment exceeds the remaining balance.
- **Pay in Full**: Added a "Pagar Totalidad" button that pre-fills the total outstanding balance.
- **Auto-Hide**: Fully paid loans now disappear automatically from the active lists.
- **Transaction Sync**: Guaranteed that the full payment amount is reflected as a single entry in the transactions history.

## Quality Audit & Traceability
- **Traceability**: Created `CHANGELOG_DAILY.md` and updated internal rules to maintain this log.
- **Cleanup**: Removed stray "(vinculado y plan simple)" labels from CashFlow toggle.
- **Responsiveness**: (Pending) Continuous auditing of mobile layouts.
