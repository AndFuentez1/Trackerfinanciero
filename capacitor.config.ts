import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Empaquetado móvil (APK) con Capacitor.
 * El build web para móvil se genera con `npm run build:mobile` (base relativa, carpeta dist_mobile).
 * Ver docs/mobile-capacitor.md para generar la APK.
 */
const config: CapacitorConfig = {
  appId: 'co.fintrack.app',
  appName: 'FinTrack',
  webDir: 'dist_mobile',
  android: {
    // El WebView sirve la app en https://localhost (permitido en el CORS del backend)
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
