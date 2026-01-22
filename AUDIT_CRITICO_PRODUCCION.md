# 🚨 Auditoría Crítica Pre-Producción - Trackerfinanciero

**Fecha:** 22 de enero de 2026  
**Objetivo:** Detectar errores críticos, comportamientos inesperados y riesgos técnicos antes del cierre

---

## ⚠️ PROBLEMAS CRÍTICOS (PRIORIDAD ALTA)

### 1. **TIMEZONE Y MANEJO DE FECHAS - RIESGO CRÍTICO DE DESFASE**

**Problema:** Uso extensivo de `.toISOString().split('T')[0]` puede causar desfases de días por conversión a UTC.

**Archivos Afectados:**
- `src/hooks/useFinanceData.ts` (líneas 288-289, 2174)
- `src/hooks/useLoans.ts` (líneas 56, 70, 81)
- `src/pages/Loans.tsx` (líneas 47, 51, 105, 110)
- `src/components/finance/AddSavingsTransactionDialog.tsx` (líneas 33, 57)
- `src/pages/Configuracion.tsx` (línea 523)
- `src/hooks/useBudgetsData.ts` (líneas 199-200)

**Escenario de Fallo:**
```typescript
// Usuario en Colombia (UTC-5) a las 21:00 del 22 de enero
new Date().toISOString().split('T')[0]
// Retorna: "2026-01-23" ❌ (día siguiente!)

// El usuario ve "22 enero" en UI pero se guarda "23 enero" en BD
```

**Impacto:** 
- Transacciones guardadas con fecha incorrecta (+1 día en zonas horarias negativas)
- Inconsistencias en reportes mensuales/anuales
- Préstamos con fechas de vencimiento erróneas
- Filtros de fecha no coinciden con lo mostrado al usuario

**Solución:**
```typescript
// ❌ MAL - Convierte a UTC
new Date().toISOString().split('T')[0]

// ✅ BIEN - Usa zona horaria local
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**Acción Inmediata:** Crear utilidad `getTodayLocalDate()` y reemplazar todas las ocurrencias.

---

### 2. **IMPORTACIÓN EXCEL - PARSING DE FECHAS INESTABLE**

**Problema:** El parsing de fechas en `ImportExcelDialog.tsx` no maneja correctamente zonas horarias en strings ISO.

**Archivo:** `src/components/finance/ImportExcelDialog.tsx` (línea 145)

**Código Problemático:**
```typescript
const parseDate = (value: string | number): string | null => {
  // Remove time / timezone parts if present
  const str = value.trim().split(/[T\s]/)[0];  // ❌ Elimina zona horaria pero...
  
  // Direct ISO yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;  // ❌ Retorna sin validar
```

**Casos No Manejados:**
- `"2026-01-22T05:00:00.000Z"` → Se convierte a `"2026-01-22"` sin considerar UTC offset
- `"05/01/2026 10:00"` → Fecha ambigua (¿día 5 o mes 5?)
- `"2026-13-45"` → Fecha inválida que pasa validación regex
- Números de serie Excel de versiones antiguas

**Impacto:**
- Datos importados con fechas incorrectas (silenciosamente)
- No hay feedback al usuario sobre fechas problemáticas
- Conversión implícita puede cambiar el día

**Solución:**
```typescript
const parseDate = (value: string | number): string | null => {
  // Excel serial number
  if (typeof value === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(value);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        // Validar fecha antes de formatear
        const parsed = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
        if (isValid(parsed)) {
          return formatDateFns(parsed, 'yyyy-MM-dd');
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  if (!value || typeof value !== 'string') return null;

  // Para strings ISO, parsear considerando que la fecha sin hora es local
  const str = value.trim().split(/[T\s]/)[0];

  // Validar formato yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parse(str, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? str : null;  // ✅ Validar antes de retornar
  }

  // Resto del código...
};
```

**Acción Inmediata:** Agregar validación con `isValid()` de date-fns antes de retornar fechas.

---

### 3. **IMPORTACIÓN EXCEL - ERRORES SILENCIOSOS EN BATCH INSERT**

**Problema:** Los errores en batch insert no detienen la importación ni informan al usuario de qué registros fallaron.

**Archivo:** `src/components/finance/ImportExcelDialog.tsx` (líneas 475-520)

**Código Problemático:**
```typescript
for (let batch = 0; batch < transactionsToImport.length; batch += batchSize) {
  try {
    const { error: insError, data } = await supabase
      .from('transactions')
      .insert(batchTransactions)
      .select();

    if (insError) {
      console.error("Error en batch insert:", insError);
      failCount += batchTransactions.length;  // ❌ Cuenta todo el batch como fallido
    } else {
      successCount += (data?.length || 0);
    }
  } catch (e) {
    console.error("Excepción en batch insert:", e);
    failCount += batchTransactions.length;  // ❌ No identifica cuál registro falló
  }
}

if (failCount > 0) {
  alert(`Importación completada con problemas. Éxito: ${successCount}, Fallo: ${failCount}.`);
  // ❌ El usuario no sabe QUÉ registros fallaron ni POR QUÉ
}
```

**Impacto:**
- Usuario cree que importó 500 registros pero solo se guardaron 300
- No hay trazabilidad de qué registros fallaron
- No se puede reintentar solo los registros fallidos
- Pérdida de datos sin feedback claro

**Solución:**
```typescript
const failedRows: { row: number; error: string }[] = [];

for (let batch = 0; batch < transactionsToImport.length; batch += batchSize) {
  const batchTransactions = transactionsToImport.slice(batch, batch + batchSize).map((t, i) => ({
    ...t,
    _rowIndex: batch + i  // Guardar índice original
  }));

  try {
    const { error: insError, data } = await supabase
      .from('transactions')
      .insert(batchTransactions.map(({ _rowIndex, ...rest }) => rest))
      .select();

    if (insError) {
      // Registrar qué registros del batch fallaron
      batchTransactions.forEach((t) => {
        failedRows.push({ 
          row: t._rowIndex + 2, // +2 por header y base-1
          error: insError.message 
        });
      });
      failCount += batchTransactions.length;
    } else {
      successCount += (data?.length || 0);
    }
  } catch (e) {
    // Similar para excepciones
  }
}

// Mostrar detalles de fallos
if (failedRows.length > 0) {
  const errorMsg = failedRows
    .slice(0, 10)
    .map(f => `Fila ${f.row}: ${f.error}`)
    .join('\n');
  
  toast({
    title: 'Importación parcial',
    description: `${successCount} exitosos, ${failCount} fallidos.\n\n${errorMsg}${failedRows.length > 10 ? '\n...(y más)' : ''}`,
    variant: 'warning',
    duration: 10000
  });
}
```

**Acción Inmediata:** Implementar tracking de errores por fila.

---

### 4. **VALIDACIÓN DE FECHAS - NO SE VALIDA ANTES DE GUARDAR**

**Problema:** Las fechas no se validan antes de enviar a Supabase, lo que puede causar errores de BD o guardar fechas inválidas.

**Archivos Afectados:**
- `src/components/finance/AddTransactionDialog.tsx`
- `src/hooks/useFinanceData.ts` (funciones `addTransaction`, `updateTransaction`)
- `src/hooks/useLoans.ts`

**Código Problemático:**
```typescript
// AddTransactionDialog.tsx - NO valida la fecha
const transactionData: Omit<Transaction, 'id'> = {
  // ...
  date: values.date,  // ❌ Acepta cualquier string sin validación
};

await onAdd(transactionData);
```

**Casos No Manejados:**
- Usuario manipula HTML y pone `date: "2026-13-45"`
- Fecha vacía o null
- Fecha en formato incorrecto
- Fechas futuras muy lejanas (typo: 2226 en vez de 2026)

**Solución:**
```typescript
// En schemas.ts
export const insertTransactionSchema = z.object({
  // ...
  date: z.string().refine((val) => {
    // Validar formato yyyy-MM-dd
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    
    // Validar que sea fecha válida
    const parsed = parse(val, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) return false;
    
    // Validar rango razonable (no más de 10 años atrás, no más de 1 año adelante)
    const now = new Date();
    const tenYearsAgo = subYears(now, 10);
    const oneYearAhead = addYears(now, 1);
    
    return isWithinInterval(parsed, { start: tenYearsAgo, end: oneYearAhead });
  }, {
    message: "Fecha inválida o fuera de rango permitido"
  }),
});
```

**Acción Inmediata:** Agregar validación de fecha en el schema Zod.

---

## ⚠️ PROBLEMAS DE IMPACTO MEDIO

### 5. **PÉRDIDA DE CONTEXTO EN IMPORTACIÓN BACKGROUND**

**Problema:** Si el usuario cierra la página durante una importación, se pierde el progreso.

**Archivo:** `src/components/finance/ImportExcelDialog.tsx` (líneas 460-465)

**Código:**
```typescript
// Guardar estado en localStorage
const importKey = `import_${user.id}_${Date.now()}`;
localStorage.setItem(importKey, JSON.stringify({
  startTime: Date.now(),
  validRows: validRows.length,
  completed: 0,
  state: 'in_progress'
}));

// ❌ Pero nunca se recupera este estado al recargar
```

**Impacto:**
- Usuario cierra pestaña y pierde progreso de importación
- No hay forma de reanudar
- LocalStorage se llena de importaciones "en progreso" huérfanas

**Solución:** Implementar recuperación de estado en `useEffect` inicial o mostrar warning antes de cerrar.

---

### 6. **FORMATEO DE MONEDA INCONSISTENTE**

**Problema:** Se usa tanto `Intl.NumberFormat` como `toLocaleString` con configuraciones diferentes.

**Archivos:** Múltiples (ver grep search)

**Ejemplos:**
```typescript
// utils.ts
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

// TransactionList.tsx
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })  // Sin minimumFractionDigits

// ImportExcelDialog.tsx
row.amount.toLocaleString()  // ❌ Sin configuración de locale
```

**Impacto:** Inconsistencias visuales en la UI (algunos con decimales, otros sin).

**Solución:** Centralizar formato de moneda en `utils.ts` y usar exclusivamente `formatCurrency()`.

---

### 7. **RESPONSIVIDAD - OVERFLOW EN TABLAS**

**Problema:** Tablas de transacciones no tienen scroll horizontal en móvil.

**Archivos:**
- `src/pages/History.tsx` (tabla de transacciones incompletas)
- `src/components/finance/ImportExcelDialog.tsx` (preview de datos)

**Solución:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* contenido */}
  </table>
</div>
```

---

## 📋 PROBLEMAS DE IMPACTO BAJO

### 8. **LOGS DE DEBUG EN PRODUCCIÓN**

**Archivos:**
- `src/components/finance/ImportExcelDialog.tsx` (líneas 500-505)
- `src/components/finance/AddTransactionDialog.tsx` (línea 227)

**Solución:** Eliminar o envolver en `if (process.env.NODE_ENV === 'development')`.

---

### 9. **FALTA MANEJO DE CATEGORÍAS SIN COLOR**

**Problema:** Si una categoría no tiene color (null/undefined), puede causar problemas visuales.

**Archivo:** `src/hooks/useFinanceData.ts` (línea 472)

**Solución Parcial:**
```typescript
color: pm.color || '#475569',  // ✅ Ya tiene fallback
```

Pero categorías no tienen fallback similar. Agregar en mapeo de categorías.

---

## 🎯 PLAN DE CORRECCIÓN PRIORIZADO

### **FASE 1 - CRÍTICO (Implementar Ahora)**

1. ✅ **Crear utilidad de fecha local** (`getTodayLocalDate()`)
2. ✅ **Reemplazar todos los `.toISOString().split('T')[0]`**
3. ✅ **Agregar validación de fechas en schema Zod**
4. ✅ **Mejorar parsing de fechas en ImportExcel con validación**
5. ✅ **Implementar tracking de errores por fila en importación**

### **FASE 2 - IMPORTANTE (Próximas 48h)**

6. ⏳ Centralizar formateo de moneda
7. ⏳ Agregar scroll horizontal a tablas
8. ⏳ Implementar recuperación de importaciones interrumpidas
9. ⏳ Agregar fallback de color para categorías

### **FASE 3 - MEJORAS (Post-Launch)**

10. 🔄 Eliminar logs de debug
11. 🔄 Mejorar feedback visual de errores
12. 🔄 Implementar retry automático para batch inserts fallidos

---

## 🚀 CÓDIGO DE LAS CORRECCIONES CRÍTICAS

### Corrección 1: Utilidad de Fecha Local

Crear archivo: `src/lib/dateUtils.ts`

```typescript
/**
 * Obtiene la fecha actual en formato yyyy-MM-dd usando la zona horaria local
 * (NO UTC, evita desfase de días)
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha Date a string yyyy-MM-dd en zona horaria local
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea string yyyy-MM-dd como fecha local (NO UTC)
 */
export function parseLocalDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validar que la fecha sea válida
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  
  return date;
}
```

### Corrección 2: Schema con Validación de Fecha

```typescript
import { z } from 'zod';
import { parseLocalDate } from '@/lib/dateUtils';
import { subYears, addYears, isWithinInterval } from 'date-fns';

export const insertTransactionSchema = z.object({
  type: z.enum(["income", "expense", "investment", "saving", "transfer_out", "transfer_in", "loan"]),
  category: z.string().nullable().optional(),
  category_id: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  description: z.string().nullable().optional(),
  date: z.string().refine((val) => {
    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    
    // Validar que sea fecha real
    const parsed = parseLocalDate(val);
    if (!parsed) return false;
    
    // Validar rango razonable (10 años atrás, 1 año adelante)
    const now = new Date();
    const minDate = subYears(now, 10);
    const maxDate = addYears(now, 1);
    
    return isWithinInterval(parsed, { start: minDate, end: maxDate });
  }, {
    message: "Fecha inválida o fuera de rango permitido (10 años atrás - 1 año adelante)"
  }),
  payment_method_id: z.string().nullable().optional(),
  to_payment_method_id: z.string().nullable().optional(),
});
```

### Corrección 3: ParseDate Robusto

```typescript
import { parse, isValid, format as formatDateFns } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

const parseDate = (value: string | number): string | null => {
  // Excel serial number
  if (typeof value === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(value);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const parsed = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
        if (isValid(parsed)) {
          return formatDateFns(parsed, 'yyyy-MM-dd');
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  if (!value || typeof value !== 'string') return null;

  // Remove time / timezone parts
  const str = value.trim().split(/[T\s]/)[0];

  // Direct ISO yyyy-MM-dd - validar con parseLocalDate
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parseLocalDate(str);
    return parsed ? str : null;
  }

  // Try multiple formats
  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'dd.MM.yyyy',
    'd.M.yyyy',
    'MM/dd/yyyy',
    'M/d/yyyy',
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed)) {
        return formatDateFns(parsed, 'yyyy-MM-dd');
      }
    } catch (e) {
      continue;
    }
  }

  return null;
};
```

---

## ✅ CHECKLIST FINAL PRE-PRODUCCIÓN

- [ ] Implementar `getTodayLocalDate()` y reemplazar todos los usos de `.toISOString().split('T')[0]`
- [ ] Agregar validación de fecha en schema Zod
- [ ] Mejorar `parseDate()` con validación robusta
- [ ] Implementar tracking de errores en importación batch
- [ ] Agregar tests para parsing de fechas con diferentes zonas horarias
- [ ] Centralizar formateo de moneda en `utils.ts`
- [ ] Agregar overflow-x-auto a todas las tablas
- [ ] Revisar que todas las categorías tengan color fallback
- [ ] Eliminar console.logs de producción
- [ ] Probar importación Excel con datos reales (500+ filas)
- [ ] Probar en diferentes zonas horarias (UTC-5, UTC+0, UTC+5)
- [ ] Probar en móviles reales (iOS/Android)

---

**Conclusión:** Los problemas de fechas/timezone y parsing de Excel son los **riesgos más altos**. Implementar las correcciones de la Fase 1 es crítico antes de producción.
