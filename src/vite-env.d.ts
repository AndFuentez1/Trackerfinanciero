/// <reference types="vite/client" />

interface Window {
  __tf_showError?: (payload: { err: Error | Record<string, unknown> } | unknown) => void;
  __tf_clearError?: () => void;
}
