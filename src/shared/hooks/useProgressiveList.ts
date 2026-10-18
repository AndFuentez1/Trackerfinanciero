import { useCallback, useEffect, useRef, useState } from 'react';

interface ProgressiveListOptions {
  /** Elementos que se montan inicialmente y en cada incremento. */
  pageSize?: number;
  /** Margen de anticipación del sentinel (px antes de llegar al final). */
  rootMargin?: string;
}

/**
 * Renderizado progresivo para listas largas: monta `pageSize` elementos y agrega más cuando
 * el sentinel entra en el viewport. Mantiene el DOM pequeño (fluidez en móviles) sin imponer
 * altura fija por fila, por lo que funciona con tablas y filas con edición inline.
 */
export function useProgressiveList<T>(items: T[], { pageSize = 100, rootMargin = '600px' }: ProgressiveListOptions = {}) {
  const [limit, setLimit] = useState(pageSize);
  const [sentinel, setSentinel] = useState<Element | null>(null);
  const totalRef = useRef(items.length);
  totalRef.current = items.length;

  // Si la lista se reduce (filtros), vuelve al tamaño inicial para no arrastrar un límite enorme.
  useEffect(() => {
    if (items.length <= pageSize) { setLimit(pageSize); }
  }, [items.length, pageSize]);

  const showMore = useCallback(() => {
    setLimit((prev) => Math.min(prev + pageSize, Math.max(totalRef.current, pageSize)));
  }, [pageSize]);

  useEffect(() => {
    if (!sentinel || typeof IntersectionObserver === 'undefined') { return; }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { showMore(); }
      },
      { rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, rootMargin, showMore]);

  const hasMore = items.length > limit;

  return {
    visibleItems: hasMore ? items.slice(0, limit) : items,
    hasMore,
    remaining: Math.max(items.length - limit, 0),
    showMore,
    /** Ref callback para el elemento sentinel al final de la lista. */
    sentinelRef: setSentinel,
  };
}
