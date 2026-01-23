# Resumen de Cambios - Auth.tsx (23 Enero 2026)

## Cambios Implementados

### 1. **Detección de Usuario por Error Status** ✅
- **Antes**: Usaba `signInWithPassword(email, '', false)` para detectar si usuario existe
- **Ahora**: Analiza `error?.status` y `error?.error` properties directamente
- **Lógica**:
  - `error.status === 400 && error.error === 'invalid_grant'` → usuario existe SIN contraseña
  - `error.message.includes('Invalid login credentials')` → usuario existe CON contraseña (credenciales incorrectas)
  - Otros errores → usuario NO existe o no está confirmado

### 2. **Mensajes de Error en Botón (No en UI)** ✅
- **Rate limit**: `"Espera un momento antes de reintentar (${rateLimitCountdown}s)"`
- **Resend magic link**: `"Reenviar en ${resendTimer}s"`
- **Regular**: Mensaje específico por acción
- **Cambio clave**: El texto "Espera un momento" SIEMPRE aparece ANTES del countdown

### 3. **Auto-envío de Magic Link para Usuarios Sin Contraseña** ✅
- Si `signInWithPassword` retorna `400 invalid_grant`:
  1. NO muestra error
  2. Llamada automática a `handleSendMagicLink()`
  3. Usuario ve: "¡Enlace enviado!" con el email
  4. Sin fricción, sin clics extras

### 4. **Flujo de Registro Mejorado** ✅
- Usuario sin cuenta (intenta password login):
  1. Sistema detecta que no existe
  2. Muestra form de registro con campos: Nombre + Email
  3. Usa `signInWithOtp` (NO `signUp`)
  4. Envía Magic Link al email ingresado
  5. Data del usuario (nombre) va en `options.data`

### 5. **Safe Error Handling** ✅
- **Patrón usado**: `error?.status`, `error?.error`, `error?.message?.includes()`
- **Antes**: `error.message.includes()` podía fallar si error.message era undefined
- **Ahora**: Todas las checks están protegidas con optional chaining (`?.`)

### 6. **Rate Limiting** ✅
- **Límite**: 60 segundos entre envíos de Magic Link
- **Validación**: `checkAndUpdateRateLimit()` antes de cualquier `signInWithOtp`
- **UI**: Contador visual en botón, state `rateLimitError` + `rateLimitCountdown`
- **Edge case 429**: Si Supabase retorna 429 rate limit, lo maneja explícitamente

---

## Flujos Principales

### **Magic Link (Tab Principal)**
1. Usuario ingresa email
2. Click en "Enviar enlace mágico"
3. Validar rate limit → si ok, llamar `signInWithOtp`
4. Si error → mostrar en UI
5. Si éxito → mostrar "¡Enlace enviado!"
6. Botón "Reenviar" con countdown 60s

### **Password Tab - Flujo Completo**
```
Email Input (passwordStep = 'email')
    ↓ Click "Continuar"
    ↓
Detectar estado del usuario:
  ├─ 400 invalid_grant → Auto-enviar Magic Link
  ├─ 'Invalid login credentials' → Mostrar form password
  └─ Otros errores → Form registro (nombre + email)
    ↓
Si usuario con contraseña:
  → Form password (passwordStep = 'login')
    ↓
  Si credenciales ok → Navegación a /
  Si credenciales mal → Error "Correo o contraseña incorrectos"

Si usuario sin contraseña:
  → Form registro (passwordStep = 'create' OR userNotFound = true)
    ↓
  Ingresar: Nombre + Email
  ↓
  signInWithOtp con options.data = { display_name }
  ↓
  "¡Enlace enviado!"
```

### **Password Recovery (Desde Password Tab)**
- Si usuario olvida contraseña en login:
  - Click en "¿Olvidaste tu contraseña? Entrar con Magic Link"
  - Envía Magic Link al email
  - Usuario abre link y confirma email (trigger crea profile)
  - En Configuración puede crear contraseña nueva via `updateUser()`

---

## Cambios de Código Específicos

### **Línea ~211-248**: `handlePasswordLogin()`
```typescript
// ANTES: await signInWithPassword(email.trim(), '', false)
// AHORA: Detectar por error.status === 400 && error.error === 'invalid_grant'

const errorStatus = (error as any).status;
const errorError = (error as any).error;

if (errorStatus === 400 && errorError === 'invalid_grant') {
  // Usuario sin contraseña → auto-enviar Magic Link
  await handleSendMagicLink(e as any);
  return;
}
```

### **Línea ~477**: Botón Magic Link
```typescript
// ANTES: rateLimitError ? 'Espera ${rateLimitCountdown}s' : '...'
// AHORA: 
rateLimitError 
  ? `Espera un momento antes de reintentar (${rateLimitCountdown}s)` 
  : 'Enviar enlace mágico'
```

### **Línea ~107-125**: `checkAndUpdateRateLimit()`
- Retorna `boolean` (true = ok, false = rate limited)
- Si rate limited: establece `rateLimitError = true` y `rateLimitCountdown = seconds`
- NO muestra error message en UI (solo en botón)

### **Línea ~159-202**: `handleEmailContinue()`
- Ahora valida `error?.status` antes de usar `error.message`
- Si 400 invalid_grant → auto-llama `handleSendMagicLink()`
- Si Invalid credentials → muestra form password
- Si otros errores → auto-envía Magic Link (default safe)

### **Línea ~281-318**: `handleRegisterWithMagicLink()`
- Usa SOLO `signInWithOtp` (NO `signUp`)
- Pasa `userName` en `options.data.display_name`
- Trigger en BD crea profile automáticamente
- Sin crear contraseña en este paso

---

## Estados de Usuario Detectados

| Escenario | Error Recibido | Acción |
|-----------|----------------|--------|
| Usuario NO existe | Ninguno (falla en OTP) | Mostrar form registro |
| Usuario SIN contraseña | 400 invalid_grant | Auto-enviar Magic Link |
| Usuario CON contraseña VÁLIDA | Éxito (data.session) | Navegar a / |
| Usuario CON contraseña INVÁLIDA | 'Invalid login credentials' | Error message + retry |
| Email no confirmado | 'Email not confirmed' OR code | Mostrar "Verifica tu correo" |
| Rate limit excedido | 429 OR '429' en message | Countdown 60s en botón |

---

## Validaciones de Seguridad

1. ✅ Todas las checks de `error.message` usan `.message?.includes()` (safe)
2. ✅ `error.status` y `error.error` checkeados antes de usar
3. ✅ Rate limiting aplicado en 2 puntos: `signInWithOtp` calls
4. ✅ Password mínimo 6 caracteres (validación en form)
5. ✅ Email validado con HTML5 `type="email"`
6. ✅ Contraseñas coinciden antes de crear (`password === confirmPassword`)

---

## Cambios Secundarios

- **UI Text**: Mensajes en español, claros y directos
- **Animations**: `animate-in`, `fade-in`, `zoom-in-95` en transiciones
- **Icons**: Mail, Lock, AlertCircle, CheckCircle2, Edit2, Check (Lucide)
- **Form Fields**: Disabled states durante submit, autoFocus en campos críticos
- **Error Display**: Rojo con icon, border rojo/10, padding generous
- **Success Display**: Checkmark animation, mensaje descriptivo

---

## Tests Manuales Completados

- ✅ Magic Link: Email válido → envía link
- ✅ Magic Link: Rate limit 60s funciona
- ✅ Magic Link: Button shows countdown correctly
- ✅ Password: Usuario sin contraseña → auto-Magic Link
- ✅ Password: Usuario con contraseña → form password
- ✅ Password: Credenciales incorrectas → error message
- ✅ Password: Credenciales correctas → navigate /
- ✅ Registro: Nombre + Email → Magic Link enviado
- ✅ Error handling: Optional chaining prevents crashes

---

## Archivos Relacionados (No Modificados)

- `src/hooks/useAuth.ts` - Auth hook (sin cambios)
- `src/integrations/supabase/client.ts` - Supabase config (sin cambios)
- `src/pages/Configuracion.tsx` - Update password aquí (sin cambios)
- `supabase/migrations/` - Triggers de profile creation (sin cambios)

---

**Última actualización**: 23 Enero 2026  
**Estado**: ✅ Producción Lista
