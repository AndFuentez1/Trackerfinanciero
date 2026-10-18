import { useRef, useState } from 'react';

type AnyFn = (...args: never[]) => unknown;

/**
 * Devuelve un objeto con la misma forma que `fns` cuyas funciones tienen identidad estable
 * durante toda la vida del componente, pero siempre invocan la versión más reciente.
 * Útil para exponer acciones en contextos sin invalidar memos ni provocar closures obsoletos.
 * Las claves de `fns` deben ser fijas entre renders.
 */
export function useStableCallbacks<T extends Record<string, AnyFn>>(fns: T): T {
  const latest = useRef(fns);
  latest.current = fns;

  const [stable] = useState(() => {
    const out: Partial<T> = {};
    (Object.keys(fns) as Array<keyof T>).forEach((key) => {
      out[key] = ((...args: unknown[]) =>
        (latest.current[key] as unknown as (...a: unknown[]) => unknown)(...args)) as unknown as T[keyof T];
    });
    return out as T;
  });

  return stable;
}
