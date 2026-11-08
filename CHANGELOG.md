# Changelog

Todas las mejoras relevantes por versión/fecha.

---

## [2026-11-08]

### Integridad de saldos (P0)
- **Saldos atómicos**: nueva RPC `adjust_balances(jsonb)` (migración `20261108120000`) que suma/resta en el servidor, en una sola sentencia y todo-o-nada. Reemplaza el `select balance` + `update balance` del cliente en crear/editar/eliminar transacción, transferencias y movimientos de ahorro (antes dos operaciones seguidas o dos pestañas pisaban el saldo). Si el paso siguiente falla (insertar/editar/borrar), el saldo se revierte o la transacción recién creada se elimina.
- **Eliminar transacción de salida de transferencia**: `transfer_out` se guarda con monto negativo y al eliminarla/editarla el saldo se movía en la dirección equivocada; ahora todos los caminos usan `balanceDeltaFor` (valor absoluto + tipo).
- **Movimiento de ahorro cambiado de cuenta**: la cuenta vieja recibía la diferencia (nuevo − viejo) en vez de perder el movimiento; ahora se revierte en la vieja y se aplica en la nueva. Los movimientos de ahorro usan el saldo devuelto por el servidor (no el local) para `balance_after_transaction`.
- **Saldo insuficiente**: si una cuenta que no es tarjeta quedaría en negativo, la operación falla con un mensaje claro (antes la transacción se guardaba y el saldo quedaba sin actualizar en silencio).
- **Eliminar cuenta de ahorro / método de pago / fusionar**: nueva RPC `delete_payment_method(id, option, transfer_to)` hace todo en una transacción; con "transferir" valida la cuenta destino **antes** de mover el saldo (antes sumaba el saldo y si un paso posterior fallaba quedaba a medias). Préstamos y facturas pendientes de la cuenta borrada se desasocian (la FK de `pending_invoices` bloqueaba el borrado).
- **Categorías duplicadas por mayúsculas**: script `supabase/scripts/2026-11-08_merge_duplicate_categories.sql` (auditoría + fusión en transacción, conserva la más antigua) que deja crear `idx_categories_user_lower_name_type`.
- Test de `deletePaymentMethod` llamaba al wrapper con un objeto (pasaba por casualidad con la opción por defecto).

### Correcciones
- **Presupuesto de ingresos**: "Configurar presupuesto" ahora lista, crea y edita presupuestos de categorías de **ingreso** (antes solo gasto/ahorro, así que un presupuesto de ingresos no se podía editar ni ver ahí). Borrado con confirmación dentro del diálogo (sin `window.confirm`).
- **Guardar presupuesto** (`saveBudget`): busca la fila (categoría, mes) y hace `update`/`insert` en vez de `upsert … onConflict`, que dependía de qué índice único existiera en la BD (falla con índices parciales). Se revisan los errores de los borrados previos. Tipos de `budgets` con `is_recurrent`.
- **Tarjetas de crédito — signo de la deuda**: al **crear** una tarjeta, la "Deuda actual" se guardaba en positivo (se leía como "sin deuda"); ahora se guarda negativa. Al **editar**, el campo muestra la deuda en positivo y la convierte; antes mostraba el balance negativo, que `MoneyInput` no deja editar, y escribir la deuda generaba un ajuste del doble con la tarjeta en positivo. Solo se registra ajuste si el usuario cambió el saldo.
- **Flujo de caja — ajustes de saldo**: nueva línea "Ajustes de saldo" (ingreso/egreso) en el detalle mensual; ya no se mezclan en "Otros ingresos"/"Gastos" ni pueden "pagar" un compromiso futuro.
- **Flujo de caja — saldo acumulado**: el mes actual sumaba sus movimientos reales al saldo real de hoy, que ya los incluye (doble conteo: un ajuste de +X en una tarjeta subía la línea 2X). Ahora fin de mes = saldo real + lo pendiente del mes; la tabla usa la misma ancla que el gráfico en todos los meses (`computeBalanceAnchorOffset`).
- **Flujo de caja**: las transacciones con tipo `savings` (el de la BD) cuentan como ahorro (antes solo `saving`).
- **Presupuestos**: "Ingresos/Gastos Reales" y el gasto total excluyen ajustes de saldo y transferencias propias.
- **Fusionar cuentas** (Agregar método de pago): el botón llamaba `mergePaymentMethods.mutateAsync`, que no existe, y fallaba siempre; ahora fusiona y muestra el error si lo hay.
- Eliminado `src/pages/BudgetsPageWithBudgetList.tsx` (borrador roto, sin uso); import de tipos corregido en `financeConstants.ts`; colores de `IncomeCard` con tokens (`bg-success`/`bg-destructive`).

### Seguridad (backend)
- `/api/gmail/search`, `import-batch`, `archive`, `delete`, `unarchive`, `/api/invoices/pending` y `/api/classifier/learn` exigen JWT (`requireAuth`); antes cualquiera con el UUID de un usuario podía importar o borrar en su cuenta. `/api/check-gmail` acepta JWT **o** la cabecera `x-cron-secret` = `CHECK_GMAIL_SECRET` (para n8n/cron). `/api/gmail-webhook` sigue público (Pub/Sub; solo confirma recepción).
- El frontend llama esas rutas con `backendFetch` (JWT) y comprueba `res.ok` al archivar/desarchivar/eliminar (antes mostraba éxito aunque fallara).
- Archivar/eliminar/desarchivar ya no tragan errores de BD: si no se guardó, responde 500 (antes la factura parecía archivada y reaparecía).
- Revisión de secretos: árbol e historial de git sin claves privadas; solo la clave pública `anon` del proyecto antiguo en bundles viejos.

### Gmail / facturas
- **Conectar Gmail**: si la ventana de Google se cerraba o fallaba sin avisar, el botón quedaba en "Conectando..." para siempre. Ahora se vigila la ventana (y un límite de 5 min), hay "Cancelar", y "Reconectar Gmail" cuando la conexión expiró (antes solo se podía desconectar). Los mensajes del popup solo se aceptan del backend o de la app.
- Nuevo botón **"Importar facturas"** cuando Gmail está conectado.
- **Revisión de facturas**: productos editables (descripción, cantidad, precio → total), quitar productos, resumen "Se registrará como" por categoría, aviso si la suma no cuadra con el total, aprobar factura por factura; la categoría sugerida se preselecciona si existe. "Nueva categoría" sale del `Select` (se desmontaba). Pestañas sin desborde.
- **Aprobación**: una transacción por (categoría, método de pago) en vez de una por producto; fecha local `yyyy-MM-dd`; en serie (en paralelo se pisaban los saldos); si falla a mitad, lo ya registrado sale de la factura para no duplicar; categorías nuevas solo de gasto y con color hex válido; facturas con solo grupos ya se pueden aprobar; "Mandar a Préstamos" ahora crea el préstamo (antes un `setTimeout` con estado viejo lo impedía).
- **Archivadas**: contador en "Ocultar archivadas", botón "Ver archivadas" y "Sacar de archivadas"; eliminar del historial pide confirmación.

### Clasificador de categorías
- Coincidencia por **palabras completas** con plurales simples (antes "pantalón" → Alimentación por "pan", "aguacate" → bebidas por "agua").
- La frase más específica gana ("aceite motor" → Moto); empate entre categorías → confianza baja (decide IA/usuario).
- Reglas aprendidas: una consulta por factura (antes una por producto), gana la más específica, se guardan normalizadas y sin cantidades/unidades ("LECHE ALQUERÍA 1100ML" → "leche alqueria").
- Corregir una categoría en la revisión de facturas **enseña** al clasificador (palabra y código del producto).

### Pruebas
- Nuevos tests: ajustes y `netoReal` del snapshot, tipo `savings`, ancla del saldo, `isBalanceAdjustment`, agrupación de facturas, clasificador, `requireAuthOrSecret`. Frontend 159 ✓ (49 omitidos, sin cambios); backend 40 ✓ y `typecheck` limpio.

### Notas de despliegue
- Desplegar **frontend y backend juntos** (el frontend anterior no envía JWT a las rutas de Gmail).
- Opcional: definir `CHECK_GMAIL_SECRET` en Render si n8n u otro cron llama `/api/check-gmail`.
- Tarjetas antiguas con deuda positiva: `supabase/scripts/2026-11-08_audit_fix_credit_cards.sql` (auditar y corregir una por una).

## [2026-10-18]

### Mejoras pendientes implementadas (`FUTURE_IMPROVEMENTS.md`)
- **Encriptación**: AES-256-GCM autenticado (`v2:iv:tag:ct`) para tokens de Gmail/Telegram y API key de Gemini; descifra valores CBC previos. Aviso en logs si `ENCRYPTION_KEY` falta o es corta.
- **BD** (migraciones `20261018120000_integrity_constraints_and_rls_audit.sql` y `20261018121000_user_configs_feature_flags.sql`): préstamos con nombre no vacío y únicos por `lower(btrim(name))`; presupuesto mensual único por `category_id`; `payment_methods.balance` negativo permitido solo en tarjetas de crédito (el CHECK anterior contradecía la convención de deuda); RLS explícito en todas las tablas de usuario, políticas base de propietario donde falten y `public.rls_audit()`; columna `user_configs.feature_flags`.
- **Rendimiento**: `useFinanceUI` memoizado y `useFinanceDataLogic` con dependencias estables (`useStableCallbacks`): el contexto financiero ya no se recalcula en cada render y las mutaciones no quedan con closures obsoletos. `updateConfig` estable.
- **Historial**: renderizado progresivo (`useProgressiveList`) y una sola vista montada (antes se renderizaban tabla y tarjetas a la vez); orden por método de pago ya no queda obsoleto.
- **Carga inicial**: 623 kB → 225 kB. Mixpanel se carga en diferido con cola de eventos y `clsx`/`tailwind-merge` salen del chunk de Recharts (antes cada `cn()` descargaba Recharts completo).
- **Gmail**: estados de sincronización por fase y `aria-live`.
- **Onboarding**: tour guiado en Flujo de Caja y Préstamos (`PageTour`).
- **Configuración**: sección "Módulos y preferencias" con toggles (Facturas Pendientes, Zona de Reclasificación) y exportar/importar preferencias (JSON validado con Zod; no incluye moneda ni datos financieros).
- **Offline**: indicador de cambios pendientes sin conexión y aviso antes de cerrar la pestaña.
- **Móvil**: Capacitor 8 (`capacitor.config.ts`, `build:mobile`, `cap:sync`, `cap:android`, `docs/mobile-capacitor.md`); backend acepta el origen del WebView.
- **QA**: Husky + lint-staged (pre-commit) y `sca:audit:prod` (pre-push); `npm audit fix` sin dependencias de producción con vulnerabilidades altas.
- **Accesibilidad**: nombres accesibles en botones de solo ícono, `aria-pressed` en temas, "Cerrar" en diálogos.

### Correcciones
- **OAuth Gmail**: si el intercambio del código con Google fallaba, el `catch` de `handleOAuthCallback` lanzaba `ReferenceError` (`stateOrigin` declarado dentro del `try`) y la ventana de conexión quedaba colgada sin mostrar el error. Nuevo script `npm run typecheck` en el backend.
- **CORS**: el backend ya no acepta cualquier `*.github.io` (solo los orígenes explícitos).
- **Filtros de fecha**: `updateFilter` formatea en hora local (`yyyy-MM-dd`) en vez de `toISOString()`.
- **Tokens**: `GmailConfigSection` y el panel de revisiones sin colores fuera del sistema (`amber`, `zinc`, `white`).
- `supabase/config.toml` apunta al proyecto activo (`wpgiyfsrdjmihgwuhrvk`).

### Repositorio
- Dejan de versionarse `node_modules/`, `.env*` (incluidos los `.env.example`), `.claude/`, `.serena/`, `.cursor/`, `CLAUDE.md`, `dist_mobile/` y artefactos de pruebas (`tmp_invoice/`, `test-*.txt`).

### Notas de despliegue
- Aplicar las dos migraciones nuevas y luego `select * from public.rls_audit();`.
- Definir `ENCRYPTION_KEY` (≥ 32 caracteres) en Render **sin cambiar la key con la que ya están cifrados los datos**; rotarla exige re-cifrar.
- `backend/.env` local apunta al proyecto Supabase antiguo (`pcdwjaxsfirliwnnikff`, ya no resuelve): actualizar `SUPABASE_URL` y la service-role key.
- Tras `npm install`, el script `prepare` activa los hooks de Husky.

## [2026-07-01]

### Instrucciones y skills del proyecto
- **`CLAUDE.md`** y **`.claude/skills/`**: instrucciones del proyecto y 8 skills de revisión (`review-categories`, `review-import-idempotency`, `review-backend-connection`, `review-income-budget`, `review-financial-mechanics`, `review-modals`, `review-commitments-subscriptions-savings`, `full-app-review`).
- `agents.md`: corregida la referencia a tipos (`src/domains/types.ts` no existe).

### Correcciones
- **Categorías**: `AddCategoryDialog` ya no se cierra ni pierde lo escrito si la creación falla; valida nombre (trim, duplicado por nombre+tipo) y muestra el error en el propio modal. La paleta agotada ya no bloquea el botón.
- **BD**: unicidad de categorías por `(user_id, lower(name), type)` (migración `20260701120000_categories_unique_name_type.sql`).
- **Modales**: eliminado `modal={false}` en 10 diálogos (overlay, foco y scroll correctos); `AddCategoryDialog` ya no vive dentro de `SelectContent`; `DataTreatmentGuard` ofrece "Cerrar sesión" y sincroniza la región; `DatabaseErrorOverlay` permite cerrar el aviso tras agotar reintentos; `confirm()` nativo de presupuestos reemplazado por confirmación en el diálogo.
- **Importación**: el respaldo de detección de duplicados pagina (límite de 1000 filas); el staging "reclama" filas antes de insertar (idempotente ante doble clic/reintento) y revierte si falla.
- **Compromisos/Suscripciones**: el pago comprueba el error de la transacción (antes marcaba pagado aunque fallara), es idempotente al reintentar, soporta `type='saving'`, no retrocede el próximo cobro al editar, fecha de fin realmente opcional, meses cortos (31 → fin de mes), fechas locales (sin desfase UTC-5), y refresca el flujo de caja.
- **Presupuesto de ingresos**: nuevo `Ingresos` en `AddBudgetDialog`; `Ingresos Estimados` (Presupuestos y Flujo de caja) usa el presupuesto de ingresos del periodo visible (fallback: proyección). `IncomeCard` muestra Estimado vs Real.
- **Tarjetas de crédito**: convención única — deuda = balance negativo. Corregidos `PayCreditCardDialog`, `PaymentMethodList`, validación de `AddTransactionDialog`, insights, patrimonio y deuda total del Dashboard (`creditCardUtils.ts`).
- **Flujo de caja**: filtro realtime sin espacio sobrante, fechas y memos estables, años disponibles derivados de los datos.
- **Backend (seguridad)**: `/api/user/config/*` exige JWT (`requireAuth`); el `userId` sale del token (403 si no coincide). OAuth Gmail con `state` firmado (HMAC + expiración), `POST /auth/google/init`, HTML escapado, `postMessage` dirigido, sin loguear URLs; `trust proxy` = 1; eliminado `auth.routes.js` duplicado; sin filtrar `error.details`.
- **Frontend ↔ backend**: `backendFetch`/`getAuthHeaders` (JWT + timeout) en las llamadas de configuración.

- **Ajuste manual de saldo**: editar el saldo de un método de pago (p. ej. +5.000.000 en una tarjeta) ya no escribe el balance directo; registra una transacción de ajuste (ingreso si sube, gasto si baja, categoría "Ajuste de saldo") que queda en historial y flujo de caja sin doble conteo.
- **Nueva categoría**: el botón desaparece mientras el modal está abierto y el modal ya no vive dentro del `Select` en `AddTransactionDialog` ni `TransactionRow`.

### Notas de despliegue
- Backend y frontend deben desplegarse juntos (el frontend antiguo no envía JWT).
- Definir `OAUTH_STATE_SECRET` en Render (si no, usa `SUPABASE_SERVICE_ROLE_KEY`).
- Si existen categorías duplicadas por mayúsculas, la migración emite un `WARNING` y no crea el índice hasta resolverlas.

## [2026-06-11]

### Correcciones de Base de Datos (SQL)

- **FK savings_transactions**: Se eliminó el `NOT NULL` en `savings_account_id` y se revinculó la constraint FK hacia `payment_methods(id) ON DELETE SET NULL`. Esto resolvía el error `savings_transactions_savings_account_id_fkey` al crear movimientos en la pestaña Ahorros.
- **Trigger `prepare_savings_transaction`**: Actualizado para aceptar `savings_account_id = NULL` y verificar primero en `payment_methods` (con `is_savings_account = true`) antes de intentar en la tabla legacy `savings_accounts`.
- **Columna `is_recurrent` en `budgets`**: Garantizada la existencia con `ADD COLUMN IF NOT EXISTS` y el índice único parcial `idx_budgets_user_id_category_id_recurrent`.
- **FK `transactions.to_payment_method_id`**: Convertida a `ON DELETE SET NULL` para permitir eliminar cuentas sin romper transacciones históricas de transferencias.

### Correcciones de UI/UX

- **Botón "Configurar presupuesto"**: Movido al extremo derecho del header de Presupuestos (después de "Nuevo presupuesto"), con estilos uniformes al resto de botones del header (`size="sm"`, mismas clases de hover, icono + texto en desktop, sólo icono en móvil).
- **Diálogo "Configurar presupuesto"**: Rediseño del layout por categoría. Ahora muestra el nombre e indicador de color como título, y debajo una fila con: campo de monto, selector de mes, toggle de recurrencia (usando `Switch` en lugar de `checkbox`), y botones de guardar/eliminar. Se añadió indicador de estado "Configurado" y hint de recurrencia.
- **Uniformidad de botones del header**: Los tres botones de acción (Nueva transacción, Nuevo presupuesto, Configurar presupuesto) comparten el mismo `size="sm"`, `variant="default"` y estructura de visibilidad `hidden sm:inline` para el texto.

- **Correcciones menores (2026-06-11)**: Se aplicaron ajustes puntuales:
	- Botones del header ahora se renderizan como iconos cuadrados en móvil y mantienen texto en desktop.
	- El diálogo de edición de presupuesto respeta la propiedad `is_recurrent` al abrirse para editar, evitando desincronías entre configurar/editar.
	- Se corrigió el filtrado de transacciones para no ocultar pagos de deuda legítimos; sólo se excluyen entradas marcadas explícitamente como "sin desembolso".

---


## [2026-04-18]

### Base de Datos y Persistencia
- **Preferencias de Interfaz**: Se agregaron las columnas `hide_incomplete_alert` y `keep_session_alive` en la tabla `user_configs` para guardar permanentemente la preferencia del usuario sobre los paneles de alertas pendientes/incompletas evitando re-pariciones al recargar o cambiar de dispositivo.
- **Análisis de Migraciones**: Todos los objetos DTOs (`transactions`, `categories`, `payment_methods`, `user_configs`, `excel_import_staging`) operan exitosamente contra la nueva base de datos. Se garantizó compatibilidad y sincronización estricta.

### Mejoras UI (Panel Principal)
- **PendingInvoicesPanel Responsivo:** Se rediseñó el panel de transacciones pendientes en el Dashboard para que los botones de acción principal (Check, Edit, Delete) se distribuyan de forma fluida y simétrica llenando `w-full`, mejorando drásticamente el flujo táctil en plataformas móviles y otorgando consistencia en la versión web.

---

## [2026-03-29]

### Autenticación y Privacidad
- **GDPR Compliance:** Implementación mandatoria del consentimiento de procesamiento de datos (Términos y Privacidad) integrado en todos los flujos de autenticación (Magic Link, Google OAuth y Contraseña).

### Estabilidad y Base de Datos
- **Manejo de Desconexión DB:** Se integró un sistema global de captura de errores de red (DatabaseErrorOverlay) para manejar pausas de Supabase con un mensaje amigable y una función de reconexión.
- **Persistencia de Perfil:** Corrección en el guardado del país ("Country") y consentimientos. El proceso revisa vía query a la base de datos si el perfil ya existe; y si faltaba creación inicial obligada, fuerza el guardado con operaciones de `Upsert`.
- **Conversor de Moneda Optimizada (Bulk):** Se rediseñó la herramienta *Conversión total*. Ya no bloquea iterando una transacción a la vez, sino que realiza modificaciones de memoria en lotes de 500 filas vía "Chunked Upserts", y expande la conversión matemática a todas las tablas del sistema que utilizan moneda (`budgets`, `future_expenses`, `payment_methods`, `savings_accounts`, `savings_transactions` y `pending_invoices`).

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
