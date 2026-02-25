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

### Seguridad y Auditoría
- [ ] **Encriptación de Datos Sensibles**: Implementar encriptación a nivel de aplicación (o via Supabase Vault/Functions) para campos como tokens de Telegram o API Keys de Gemini.
- [ ] **Constraints de Base de Datos**: Añadir restricciones `UNIQUE` y validaciones `CHECK` a nivel de SQL para evitar duplicidad de préstamos y transacciones inconsistentes.
- [ ] **Seguridad RLS**: Realizar una auditoría completa de las políticas Row Level Security en Supabase.

### Rendimiento (Performance)
- [ ] **Auditoría de Memoización**: Revisar hooks pesados como `useFinanceDataLogic` para asegurar que `useMemo` y `useCallback` tengan dependencias estables y evitar re-renders innecesarios.
- [ ] **Virtualización**: Implementar `virtuoso` o similar si el historial de transacciones crece por encima de los 1,000 registros para mantener la fluidez en móviles.

### UX / UI
- [ ] **Feedback de Sincronización**: Mejorar los estados de carga ("Conectando...", "Sincronizando...") en la integración con Gmail para que sean más granulares.
- [ ] **Onboarding Interactivo**: Crear un tour guiado para nuevos usuarios que explique las secciones de "Flujo de Caja" y "Préstamos".
- [ ] **Toggles de Funcionalidad**: Implementar interruptores en Configuración para mostrar/ocultar módulos (Facturas Pendientes, Zona de Reclasificación).

### Aplicación Móvil y Modo Offline
- [ ] **Capacitor Wrapper**: Convertir la aplicación en una APK funcional utilizando WebView con Capacitor.
- [ ] **Capacidades Offline**: Permitir el registro de datos sin conexión y sincronización inteligente posterior.

### Gestión de Configuración
- [ ] **Portabilidad**: Opción para exportar e importar la configuración personalizada (temas, preferencias) entre dispositivos.

### Infraestructura y QA
- [ ] **Automatización de Lints**: Configurar Husky y lint-staged para ejecutar lints y SCA antes de cada commit.
- [ ] **Rendimiento**: Revisar CLS/TTI con datasets reales y optimizar carga de módulos pesados.
- [ ] **Accesibilidad**: Auditoría completa (teclado, aria-labels, contraste).
- [ ] **Testing**: Backlog de tests guardado en `docs/tests-backlog.md` para reactivar la suite.
