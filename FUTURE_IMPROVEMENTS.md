# Mejoras Futuras y Roadmap

Este documento detalla las mejoras pendientes y las estrategias para escalamiento técnico del Tracker Financiero.

## 1. Internacionalización (i18n) - Soporte Multi-idioma
La arquitectura actual con el hook `useSEO` centralizado facilita la implementación de múltiples idiomas.

### Pasos para la Implementación:
1. **Instalación de Dependencias**:
   - `npm install i18next react-i18next i18next-browser-languagedetector`.
2. **Estructura de Diccionarios**:
   - Crear `/src/core/i18n/locales/{es,en}/common.json`.
3. **Configuración Centralizada**:
   - Crear `i18n.ts` en `src/core/i18n/` para inicializar la librería.
4. **Refactorización de `useSEO`**:
   - Modificar el hook para que acepte claves de traducción en lugar de strings literales.
5. **Migración de Componentes**:
   - Reemplazar textos hardcodeados en la UI por el hook `useTranslation`.
6. **Selector de Idioma**:
   - Añadir un toggle en la sección de Configuración para cambiar entre español e inglés.

---

## 2. Otras Mejoras Pendientes

> Revisión del 2026-10-18: implementado lo marcado con [x]. Detalle en `CHANGELOG.md`.

### Seguridad y Auditoría
- [x] **Encriptación de Datos Sensibles**: tokens de Gmail/Telegram y API key de Gemini cifrados con AES-256-GCM autenticado (`encryption.service.js`, formato `v2:`), compatible con valores CBC previos.
  - [ ] Pendiente: configurar en Render una `ENCRYPTION_KEY` de ≥ 32 caracteres y re-cifrar los valores existentes (hoy se avisa en logs si falta).
- [x] **Constraints de Base de Datos**: préstamos con nombre no vacío y únicos sin distinguir mayúsculas; presupuesto mensual único por `category_id`; balance negativo permitido solo en tarjetas de crédito (migración `20261018120000`).
- [x] **Seguridad RLS**: RLS forzado en todas las tablas de usuario, políticas base de propietario donde faltaban y función `public.rls_audit()` (solo `service_role`) para auditar.
  - [ ] Pendiente: ejecutar `select * from public.rls_audit();` en producción tras aplicar la migración y revisar las filas con `issue`.

### Rendimiento (Performance)
- [x] **Auditoría de Memoización**: `useFinanceDataLogic` y `useFinanceUI` con dependencias estables (`useStableCallbacks` para mutaciones); el contexto ya no se invalida en cada render.
- [x] **Virtualización**: renderizado progresivo del historial (`useProgressiveList`, 100 filas por tramo) y una sola vista montada (tabla o tarjetas) según el breakpoint.

### UX / UI
- [x] **Feedback de Sincronización**: fases granulares en Gmail (preparando, esperando autorización, verificando, desconectando, buscando, importando).
- [x] **Onboarding Interactivo**: tour guiado en "Flujo de Caja" y "Préstamos" (`PageTour`), reabrible con "¿Cómo funciona?".
- [x] **Toggles de Funcionalidad**: Configuración → Módulos y preferencias (Facturas Pendientes, Zona de Reclasificación), sincronizado en `user_configs.feature_flags`.

### Aplicación Móvil y Modo Offline
- [x] **Capacitor Wrapper**: configuración, scripts y guía en `docs/mobile-capacitor.md`.
  - [ ] Pendiente: `npx cap add android` y generar el APK firmado (requiere Android Studio).
- [~] **Capacidades Offline**: los cambios hechos sin conexión quedan en cola y se sincronizan al reconectar, con indicador y aviso al cerrar la pestaña.
  - [ ] Pendiente: persistir la cola y el caché entre recargas (requiere `setMutationDefaults` por mutación y decidir qué datos financieros pueden guardarse en el dispositivo).

### Gestión de Configuración
- [x] **Portabilidad**: exportar/importar preferencias (tema, decimales, sesión, módulos) como JSON validado.

### Infraestructura y QA
- [x] **Automatización de Lints**: Husky + lint-staged (ESLint en archivos staged) en pre-commit y SCA de dependencias de producción en pre-push.
  - [ ] Pendiente: corregir los ~35 `any` restantes en `AdvancedSettings`, `CategoryBudgetList`, etc. (lint-staged los marcará al tocar esos archivos) y las vulnerabilidades altas de devDependencies (requieren versiones mayores).
- [x] **Rendimiento**: carga inicial de 623 kB → 225 kB (Mixpanel diferido y Recharts fuera del chunk inicial).
  - [ ] Pendiente: medir CLS/TTI con datasets reales (Lighthouse en dispositivo).
- [x] **Accesibilidad**: etiquetas accesibles en botones de solo ícono, `aria-live` en estados de sincronización, `aria-pressed` en el selector de tema, textos de cierre en español.
  - [ ] Pendiente: auditoría de contraste y navegación por teclado con lector de pantalla.
- [x] **Testing**: la suite está activa (Vitest, 148 tests frontend + 29 backend); `docs/tests-backlog.md` queda como referencia histórica.
