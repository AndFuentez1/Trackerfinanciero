# ImportStatusBar Component

Barra de estado persistente para mostrar el progreso de importación desde Excel en la vista Historial.

## 📋 Características

- **Múltiples estados**: importando, en segundo plano, cancelada, completada pendiente de aprobación
- **Barra de progreso visual**: muestra el porcentaje de registros procesados
- **Acciones contextuales**: cancelar, mover a segundo plano, reintentar, aprobar
- **Animaciones suaves**: fade-in y slide-in al aparecer
- **Minimizable**: en modo segundo plano puede minimizarse para no ocupar espacio
- **Desaparece automáticamente**: cuando el proceso finaliza o se cancela definitivamente

## 🎨 Estados

### 1. Importación en progreso (`importing`)
```tsx
<ImportStatusBar
  status="importing"
  processedCount={1240}
  totalCount={3775}
  onCancel={handleCancel}
  onMoveToBackground={handleMoveToBackground}
/>
```
- **Color**: Azul (información)
- **Ícono**: Loader2 (spinner animado)
- **Elementos**: Barra de progreso + contador + botones de acción

### 2. Importación en segundo plano (`background`)
```tsx
<ImportStatusBar
  status="background"
  processedCount={2100}
  totalCount={3775}
  onShowStatus={handleShowStatus}
/>
```
- **Color**: Gris neutro
- **Ícono**: Loader2 pequeño
- **Elementos**: Barra de progreso mínima + botón "Ver estado"
- **Minimizable**: Sí (botón chevron)

### 3. Importación cancelada (`cancelled`)
```tsx
<ImportStatusBar
  status="cancelled"
  processedCount={1240}
  totalCount={3775}
  onRetry={handleRetry}
  onDiscard={handleDiscard}
/>
```
- **Color**: Naranja (advertencia)
- **Ícono**: XCircle
- **Elementos**: Mensaje informativo + botones "Reintentar" y "Descartar"

### 4. Importación completada (`completed`)
```tsx
<ImportStatusBar
  status="completed"
  totalCount={3775}
  onReviewAndApprove={handleReviewAndApprove}
/>
```
- **Color**: Verde esmeralda (éxito)
- **Ícono**: CheckCircle2
- **Alerta interna**: Ámbar indicando que los datos no afectan saldos aún
- **Elementos**: Mensaje de completado + alerta + botón "Revisar y aprobar registros"

## 🔧 Integración en History.tsx

```tsx
import { ImportStatusBar } from '@/components/finance/ImportStatusBar';

// En el componente
const {
  importProgress,
  hasPendingImport,
  startImport,
  cancelImport,
  confirmImportData,
  pendingImportData,
} = useFinanceData();

// En el JSX
<ImportStatusBar
  status={
    importProgress.status === 'loading' 
      ? 'importing' 
      : importProgress.status === 'completed' && hasPendingImport
        ? 'completed'
        : importProgress.status === 'cancelled'
          ? 'cancelled'
          : 'idle'
  }
  processedCount={importProgress.recordsProcessed || 0}
  totalCount={pendingImportData.length || importProgress.recordsProcessed || 0}
  onCancel={cancelImport}
  onReviewAndApprove={confirmImportData}
/>
```

## 📐 Diseño UX

### Principios
- **Visibilidad**: Nunca ocultar estado de importación activa
- **Control**: Usuario decide si continúa viendo o minimiza
- **Confianza**: Información clara sobre qué falta y qué se ha procesado
- **Seguridad**: Los datos no afectan saldos hasta que el usuario apruebe

### Comportamiento
- Aparece animada cuando inicia una importación
- Permanece visible durante todo el proceso
- Se puede minimizar en modo segundo plano
- Desaparece al completar o descartar
- Cancela solo el proceso futuro, no revierte lo ya importado

## 🎯 Estados del hook useFinanceData

| Estado Hook | Estado UI | Acción |
|------------|-----------|--------|
| `loading` | `importing` | Mostrar progreso activo |
| `completed` + `hasPendingImport` | `completed` | Solicitar aprobación |
| `cancelled` | `cancelled` | Ofrecer reintentar o descartar |
| `idle` | `idle` | No mostrar barra |

## 🚀 Próximas mejoras

- [ ] Persistir estado de minimizado en localStorage
- [ ] Agregar notificación sonora al completar
- [ ] Permitir pausar y reanudar importación
- [ ] Mostrar preview de registros antes de aprobar
- [ ] Detectar errores en registros y permitir corrección in-situ
