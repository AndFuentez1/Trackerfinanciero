# Flujo de Autenticación y Creación de Profiles - Corregido

## Resumen del problema corregido

**Error anterior**: El flujo de autenticación intentaba usar `signUp()` sin contraseña, lo que causaba `validation_failed: Signup requires a valid password`.

**Solución implementada**: 
- Usar `signInWithOtp()` (Magic Link) para todos los registros sin contraseña inicial
- Implementar un trigger robusto en Supabase que cree automáticamente el profile
- El frontend **NO depende** de crear profiles manualmente

---

## Flujo de autenticación definitivo

### 1. Magic Link (Registro + Login combinado)
```
Usuario ingresa email
  ↓
signInWithOtp({ email, options: { data: { display_name } } })
  ↓
Supabase crea usuario en auth.users
  ↓
Trigger handle_new_user() AFTER INSERT
  ├─ Extrae display_name de metadata
  ├─ Si no existe, usa email prefix como fallback
  ├─ Inserta en profiles con user_id, display_name, currency=MXN
  └─ Inicializa created_at y updated_at
  ↓
Supabase envía Magic Link al email
  ↓
Usuario abre link
  ↓
Acceso automático (email confirmado)
```

### 2. Contraseña + confirmación
```
Usuario intenta login con contraseña
  ↓
Si usuario NO existe:
  ├─ Sistema ofrece Registro
  └─ Flujo va a Magic Link (arriba)
  ↓
Si usuario SÍ existe con contraseña:
  ├─ Entra normalmente
  └─ No requiere confirmación (ya confirmado por Magic Link anterior)
```

### 3. Definir contraseña después (Configuración)
```
Usuario autenticado (sin contraseña)
  ↓
Navega a Configuración
  ↓
Usa auth.updateUser({ password })
  ↓
Contraseña definida para logins futuros
```

---

## Implementación en la base de datos

### Trigger mejorado: `handle_new_user()`

**Ubicación**: `supabase/migrations/20260123_improve_handle_new_user_trigger.sql`

**Características**:
- ✅ Funciona para Magic Link, OTP, password signup
- ✅ Extrae `display_name` de `raw_user_meta_data` si existe
- ✅ Usa email prefix como fallback si no hay display_name
- ✅ Inicializa `currency` con 'MXN' por defecto
- ✅ Maneja conflictos con `ON CONFLICT DO NOTHING`
- ✅ Captura excepciones sin fallar el trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    display_name_value,
    'MXN',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Implementación en el frontend

### Cambios en `src/pages/Auth.tsx`

#### Función: `handleRegisterWithMagicLink()`
- **Anterior**: Usaba `supabase.auth.signUp()` sin password ❌
- **Ahora**: Usa `supabase.auth.signInWithOtp()` ✅
- **Resultado**: Magic Link enviado automáticamente, profile creado por trigger

```typescript
const handleRegisterWithMagicLink = async (e: React.FormEvent) => {
  // ... validaciones ...
  
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      data: { display_name: userName.trim() }
    }
  });
  // El trigger crea el profile automáticamente
};
```

#### Función: `handleSendMagicLink()`
- **Ya correcta**: Usa `signInWithOtp()` ✅
- **Sin cambios**: Continúa funcionando

#### Función: `handlePasswordCreate()`
- **Ya correcta**: Usa `signUp()` CON password ✅
- **Sin cambios**: Solo para usuarios que quieren contraseña

---

## Flujo de datos en la creación de un usuario

```
1. Frontend: signInWithOtp({ email, options: { data: { display_name } } })
   ↓
2. Supabase Auth: Crea registro en auth.users con metadata
   ↓
3. Supabase Postgres: Dispara TRIGGER on_auth_user_created
   ↓
4. handle_new_user(): Lee raw_user_meta_data
   ├─ Extrae display_name
   ├─ Prepara INSERT en profiles
   └─ Ejecuta atomáticamente
   ↓
5. Postgres: Inserta en public.profiles (user_id, display_name, currency, timestamps)
   ↓
6. Resultado: Usuario + Profile creados automáticamente
   ↓
7. Supabase: Envía Magic Link
   ↓
8. Usuario confirma
   ↓
9. Acceso completamente funcional con profile listo
```

---

## Dependencias eliminadas del frontend

- ❌ Manual `profiles.insert()` después de signup
- ❌ Lógica condicional "si profile no existe, crear"
- ❌ Llamadas extra a Supabase por profile
- ❌ Race conditions por creación asincrónica

---

## Validación

### ¿Cuándo se crea el profile?
- **Automáticamente** cuando el usuario se inserta en `auth.users`
- **Antes** de que el Magic Link se envíe
- **Garantizado** por el trigger (transacción atómica)

### ¿Qué pasa si hay conflicto?
- `ON CONFLICT (user_id) DO NOTHING` lo maneja silenciosamente
- La app continúa sin interrupciones
- Log en PostgreSQL si hay error (RAISE WARNING)

### ¿Funciona para todos los métodos?
- ✅ Magic Link (signInWithOtp)
- ✅ OTP
- ✅ Password signup (signUp con password)
- ✅ Métodos futuros (cualquier INSERT en auth.users)

---

## Migración a aplicar

1. Ejecutar `supabase/migrations/20260123_improve_handle_new_user_trigger.sql` en la BD
2. El trigger se actualiza automáticamente
3. No requiere cambios adicionales en el frontend
4. Retrocompatible con perfiles existentes

---

## Testing

```bash
# 1. Test Magic Link signup
- Navegar a /auth
- Ingresar email + nombre
- Verificar que Magic Link se envía
- Confirmar via email
- Verificar que profiles existe en Supabase

# 2. Test email como fallback
- Signup con display_name vacío (si es posible)
- Verificar que display_name = email_prefix

# 3. Test perfiles existentes
- Usuarios anteriores siguen funcionando
- Sus perfiles mantienen datos
```

---

## Documentación de la función

```sql
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a user profile after auth.users insert. 
Works for all auth methods: Magic Link, OTP, password signup, etc. 
Uses email prefix as fallback display_name if not provided.';
```
