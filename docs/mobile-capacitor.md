# App móvil (APK) con Capacitor

La app web se empaqueta en un WebView nativo con Capacitor 8. La configuración está en `capacitor.config.ts`.

## Requisitos
- Node 24 (ver `engines` en `package.json`).
- Android Studio (incluye Android SDK) y JDK 21.

## Primera vez
```bash
npm install
npm run build:mobile        # build con base relativa en dist_mobile/
npx cap add android         # genera la carpeta android/ (proyecto nativo)
```

## Ciclo de trabajo
```bash
npm run cap:sync            # build:mobile + copia a android/
npm run cap:android         # sync + abre Android Studio
```
En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Para publicar, generar un APK/AAB firmado con **Generate Signed Bundle / APK**.

## Notas
- `vite --mode capacitor` usa `base: './'` (GitHub Pages usa `/Trackerfinanciero/`). Las rutas funcionan porque la app usa `HashRouter`.
- En el WebView el origen es `https://localhost`: `getBackendUrl()` lo resuelve al backend de Render y el CORS del backend lo permite.
- Las variables `VITE_*` se leen de `.env` / `.env.local` igual que en el build web.
- El login con Google/OAuth de Supabase dentro del WebView requiere agregar la URL de redirección de la app en Supabase → Authentication → URL Configuration.
- `dist_mobile/` y `android/app/build/` no se versionan.
