# 🧪 Plan de Pruebas - ImportStatusBar

## ✅ Cambios implementados

### 1. **Logging detallado agregado**
- ✅ `History.tsx`: useEffect que logea cambios en `importProgress`
- ✅ `ImportStatusBar.tsx`: console.log en cada render con status
- ✅ `History.tsx`: Panel DEBUG visible en desarrollo con todos los estados

### 2. **Lógica de visibilidad mejorada**
- ✅ IIFE en History.tsx que calcula `barStatus` con lógica robusta
- ✅ Condiciones de fallback: si hay pendingImportData y hasPendingImport, muestra 'completed'
- ✅ Logging cuando barStatus !== 'idle'

### 3. **Integración con addTransactionsBulk**
- ✅ Actualiza `importProgress` durante todo el proceso:
  - 0%: "Iniciando importación..."
  - 30%: "Insertando transacciones..."
  - 60%: "Recalculando balances..."
  - 90%: "Finalizando importación..."
  - 100%: "X transacciones importadas correctamente"
- ✅ Maneja errores y actualiza estado a 'failed'
- ✅ Auto-limpia después de 3 segundos (muestra completado → desaparece)

## 🔍 Cómo probar

### Prueba 1: Importación desde History
1. Ir a `/historial`
2. Abrir panel DEBUG (solo en desarrollo)
3. Click en "Importar desde Excel"
4. Seleccionar archivo con transacciones
5. Observar:
   - ✅ Panel DEBUG actualiza `status` → loading
   - ✅ ImportStatusBar aparece con estado "importing"
   - ✅ Barra de progreso se actualiza (0% → 30% → 60% → 90% → 100%)
   - ✅ Al completar, cambia a estado "completed" con mensaje de éxito
   - ✅ Después de 3 segundos, desaparece (status → idle)

### Prueba 2: Estados en consola
Verificar en console.log:
```
📊 IMPORT STATE: { status, hasPendingImport, recordsProcessed, ... }
🔍 ImportStatusBar render: { status, processedCount, totalCount }
🎨 RENDERING ImportStatusBar with: { barStatus, importStatus, ... }
```

### Prueba 3: Error en importación
1. Importar archivo con datos inválidos (forzar error de BD)
2. Observar:
   - ✅ status cambia a 'failed'
   - ✅ Toast con error
   - ✅ hasPendingImport se resetea a false

## 🎯 Estados esperados en cada caso

| Acción | importProgress.status | hasPendingImport | barStatus | Visible |
|--------|----------------------|------------------|-----------|---------|
| Antes de importar | idle | false | idle | ❌ No |
| Durante importación | loading | true | importing | ✅ Sí |
| Completada (3s) | completed | true | completed | ✅ Sí |
| Después de 3s | idle | false | idle | ❌ No |
| Error | failed | false | idle | ❌ No (toast) |

## 🐛 Posibles problemas y soluciones

### Problema: La barra no aparece nunca
**Diagnóstico:**
- Revisar panel DEBUG: ¿status está cambiando?
- Revisar console: ¿se ejecuta el logging de ImportStatusBar?

**Soluciones:**
1. Si status no cambia: El problema está en `addTransactionsBulk` no ejecutándose
2. Si status cambia pero no renderiza: Problema de React re-render → verificar que estados sean nuevos objetos
3. Si renderiza pero está oculto: CSS o componente padre tiene `display: none`

### Problema: La barra desaparece muy rápido
**Solución:** Aumentar el timeout en `addTransactionsBulk` línea del setTimeout de 3000 a mayor valor

### Problema: La barra se queda pegada (no desaparece)
**Solución:** 
- Verificar que el setTimeout se ejecute
- Manualmente llamar `setImportProgress({ status: 'idle', progress: 0, message: '' })`

## 📝 Próximos pasos (no implementados aún)

- [ ] **Modo aprobación**: Opción para que History también use flujo de aprobación (como onboarding)
- [ ] **Persistencia**: Guardar estado en localStorage para sobrevivir refreshes
- [ ] **Cancelación**: Permitir cancelar importación en progreso
- [ ] **Retry**: Implementar lógica de reintento en caso de error
- [ ] **Background mode**: Implementar verdadero modo segundo plano con Web Workers

## 🔧 Archivos modificados

1. ✅ `src/components/finance/ImportStatusBar.tsx` - Logging agregado
2. ✅ `src/pages/History.tsx` - Lógica de visibilidad mejorada + panel DEBUG + useEffect logging
3. ✅ `src/hooks/useFinanceData.ts` - `addTransactionsBulk` actualiza importProgress

## 🎨 UI States verificados

- ✅ `importing`: Azul con spinner + barra de progreso
- ✅ `completed`: Verde con check + mensaje de éxito
- ❌ `cancelled`: No implementado aún (requiere botón cancel funcional)
- ❌ `background`: No implementado aún (requiere Web Workers o async real)
- ❌ `failed`: Implementado en estado pero no tiene UI visual (solo toast)
