# 🧪 Plan de Testing - Correcciones Críticas

## Test 1: Validación de Timezone en Fechas

### Objetivo
Verificar que las fechas se guardan correctamente sin desfase por UTC.

### Pasos
1. **Configurar hora del sistema a 23:00 (hora local)**
2. **Crear una transacción**
   - Tipo: Gasto
   - Monto: 10000
   - Categoría: Alimentación
   - Fecha: Dejar la fecha por defecto (hoy)
3. **Verificar en Supabase:**
   ```sql
   SELECT date, created_at 
   FROM transactions 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Resultado esperado:**
   - `date` debe ser la fecha actual (no +1 día)
   - Ejemplo: Si es 22 de enero a las 23:00, debe guardar `2026-01-22`, NO `2026-01-23`

### Casos de prueba adicionales
- [ ] Crear transacción a las 00:30 (verificar no sea día anterior)
- [ ] Crear préstamo cerca de medianoche
- [ ] Importar Excel con fechas cerca de medianoche

---

## Test 2: Validación de Fechas en Schema

### Objetivo
Verificar que el schema rechaza fechas inválidas.

### Casos de prueba

#### 2.1 Fecha inválida (día no existe)
```
Acción: Intentar crear transacción con fecha 2026-02-30
Resultado esperado: Error "Fecha inválida o fuera de rango permitido"
```

#### 2.2 Fecha muy antigua
```
Acción: Intentar crear transacción con fecha 2000-01-01
Resultado esperado: Error "Fecha inválida o fuera de rango permitido"
```

#### 2.3 Fecha muy futura
```
Acción: Intentar crear transacción con fecha 2030-01-01
Resultado esperado: Error "Fecha inválida o fuera de rango permitido"
```

#### 2.4 Formato incorrecto
```
Acción: Manipular HTML y poner fecha "22/01/2026"
Resultado esperado: Error de validación
```

#### 2.5 Fechas válidas (deben pasar)
- [ ] Fecha de hoy
- [ ] Hace 5 años
- [ ] En 6 meses
- [ ] Último día del mes (2026-01-31)
- [ ] Año bisiesto (2024-02-29)

---

## Test 3: Importación Excel - Parsing de Fechas

### Objetivo
Verificar que el parsing de fechas Excel es robusto y valida correctamente.

### Preparar archivo de prueba Excel

Crear archivo `test_dates.xlsx` con estas filas:

| Fecha | Descripción | Categoría | Valor |
|-------|-------------|-----------|-------|
| 22/01/2026 | Fecha válida DD/MM/YYYY | Comida | 10000 |
| 2026-01-22 | Fecha válida ISO | Comida | 10000 |
| 01-22-2026 | Fecha válida MM-DD-YYYY | Comida | 10000 |
| 45202 | Número serial Excel válido | Comida | 10000 |
| 2026-13-45 | **Fecha inválida** | Comida | 10000 |
| 2026-02-30 | **Día no existe** | Comida | 10000 |
| invalid | **Texto inválido** | Comida | 10000 |
| 2026-01-22T05:00:00Z | ISO con timezone | Comida | 10000 |

### Pasos
1. Importar el archivo
2. **Verificar en preview:**
   - Filas 1-4, 8: Deben mostrar ✓ (válidas)
   - Filas 5-7: Deben mostrar ✗ con error "Fecha inválida"
3. Hacer clic en "Importar"
4. **Verificar resultado:**
   - Toast debe mostrar: "✓ 5 exitosos | ✗ 3 fallidos"
   - Debe listar: "Fila 6: Fecha inválida", "Fila 7: Fecha inválida", etc.

### Casos adicionales
- [ ] Archivo con 500+ filas (verificar performance)
- [ ] Mezcla de formatos de fecha
- [ ] Fechas con horas (2026-01-22 10:30)
- [ ] Celdas vacías de fecha

---

## Test 4: Tracking de Errores en Batch Insert

### Objetivo
Verificar que los errores de importación muestran detalle por fila.

### Preparar archivo con errores forzados

Crear `test_errors.xlsx`:

| Fecha | Descripción | Categoría | Valor |
|-------|-------------|-----------|-------|
| 22/01/2026 | OK | Comida | 10000 |
| 22/01/2026 | OK | Comida | 10000 |
| invalid_date | Error fecha | Comida | 10000 |
| 22/01/2026 | OK | Comida | 10000 |
| 22/01/2026 | Error monto | Comida | abc |
| 22/01/2026 | OK | Comida | 10000 |

### Pasos
1. Importar archivo
2. **Verificar toast de error:**
   - Debe mostrar: "✓ 4 exitosos | ✗ 2 fallidos"
   - Debe incluir: "Fila 4: Fecha inválida"
   - Debe incluir: "Fila 6: Monto inválido" (o similar)
3. **Verificar diálogo permanece abierto** para revisar errores

### Casos adicionales
- [ ] Archivo con 100 filas, 10 con errores (verificar que muestra las 10)
- [ ] Archivo con 100 filas, todas con errores
- [ ] Error de BD (categoría no existe, etc.)

---

## Test 5: Préstamos y Fechas

### Objetivo
Verificar que préstamos usan fechas locales correctamente.

### 5.1 Crear préstamo
```
Acción: Crear préstamo nuevo
  - Nombre: "Préstamo Test"
  - Monto: 1000000
  - Tipo: Tomé prestado
  - Método de pago: Efectivo
  - Abono inicial: 100000
```

### Verificar en BD:
```sql
-- Verificar fecha de transacciones del préstamo
SELECT date, description, type, amount 
FROM transactions 
WHERE description LIKE '%Préstamo Test%' 
ORDER BY created_at DESC;
```

**Resultado esperado:**
- Ambas transacciones deben tener `date = hoy` (sin desfase)

### 5.2 Hacer pago de préstamo
```
Acción: Hacer pago de 50000 al préstamo
```

**Verificar:**
- Fecha del pago en `loan_payments` debe ser hoy
- Transacción de pago debe tener fecha de hoy

---

## Test 6: Responsividad Mobile (Manual)

### Dispositivos de prueba
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad
- [ ] Emulador Chrome DevTools (375px)

### Áreas críticas a probar

#### 6.1 Tabla de Historial
```
Acción: Ir a /history
Verificar:
  - [ ] Tabla tiene scroll horizontal si es necesario
  - [ ] No hay overflow cortado
  - [ ] Botones de acción visibles
```

#### 6.2 Importación Excel - Preview
```
Acción: Importar Excel y ver preview
Verificar:
  - [ ] Tabla de preview tiene scroll horizontal
  - [ ] Todas las columnas visibles
  - [ ] Botón "Importar" visible
```

#### 6.3 Diálogos y Formularios
```
Verificar en móvil:
  - [ ] AddTransactionDialog cabe en pantalla
  - [ ] Selects de categoría/método de pago usables
  - [ ] Teclado no oculta campos importantes
  - [ ] Botones de guardar siempre visibles
```

---

## Test 7: Zona Horaria (Crítico)

### Objetivo
Probar app en diferentes zonas horarias.

### Método 1: Cambiar zona horaria del sistema

**Windows:**
```powershell
Set-TimeZone -Name "Pacific Standard Time"  # UTC-8
Set-TimeZone -Name "UTC"                    # UTC+0
Set-TimeZone -Name "Tokyo Standard Time"    # UTC+9
```

**Linux/Mac:**
```bash
sudo ln -sf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime  # UTC-8
sudo ln -sf /usr/share/zoneinfo/UTC /etc/localtime                  # UTC+0
sudo ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime          # UTC+9
```

### Método 2: DevTools (Chrome)

1. Abrir DevTools (F12)
2. Settings → Sensors → Location
3. Agregar timezone customizado

### Pruebas por zona horaria

#### UTC-8 (California) - 23:00 del 22/01/2026
```
Acción: Crear transacción
Verificar: date = 2026-01-22 (NO 2026-01-23)
```

#### UTC+0 (Londres) - 23:00 del 22/01/2026
```
Acción: Crear transacción
Verificar: date = 2026-01-22
```

#### UTC+9 (Tokio) - 23:00 del 22/01/2026
```
Acción: Crear transacción
Verificar: date = 2026-01-22
```

---

## Test 8: Regresión (No romper funcionalidad existente)

### Flujos críticos a verificar

- [ ] Login con magic link funciona
- [ ] Crear categoría nueva
- [ ] Crear método de pago nuevo
- [ ] Crear transacción de todos los tipos (ingreso, gasto, ahorro, transferencia)
- [ ] Editar transacción
- [ ] Eliminar transacción
- [ ] Crear presupuesto
- [ ] Filtrar por fecha en historial
- [ ] Gráficas muestran datos correctos
- [ ] Exportar/Importar datos completo
- [ ] Configuración de cuenta

---

## 📊 Reporte de Testing

### Template para documentar resultados

```markdown
## Test: [Nombre del test]
**Fecha:** [Fecha de ejecución]
**Tester:** [Nombre]
**Dispositivo/Browser:** [Info]

### Resultados
- [ ] ✅ Caso 1: [Descripción] - PASS
- [ ] ❌ Caso 2: [Descripción] - FAIL
  - Error encontrado: [Detalle]
  - Severidad: [Alta/Media/Baja]
  - Pasos para reproducir: [...]

### Bugs encontrados
1. [Bug #1]
2. [Bug #2]

### Notas adicionales
[Observaciones, sugerencias]
```

---

## 🚨 Criterios de Aceptación para Producción

### Bloqueantes (DEBEN pasar)
- [x] ✅ Test 1: Timezone - Fechas correctas en UTC-5
- [ ] ⏳ Test 2: Validación fechas - Schema rechaza inválidas
- [ ] ⏳ Test 3: Import Excel - Parsing robusto
- [ ] ⏳ Test 4: Tracking errores - Usuario ve detalles

### Importantes (DEBERÍAN pasar)
- [ ] Test 5: Préstamos - Fechas correctas
- [ ] Test 6: Mobile - UI usable
- [ ] Test 7: Multi-timezone - Consistente
- [ ] Test 8: Regresión - Todo funciona

### Deseables (PUEDEN fallar temporalmente)
- Console.logs eliminados
- Performance optimizada
- Overflow tablas perfecto

---

**Nota:** Ejecutar estos tests antes de hacer deploy a producción.
