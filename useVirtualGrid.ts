import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface VirtualRow<T> {
  rowIndex: number;
  offsetTop: number;
  items: T[];
  startIndex: number;
  endIndex: number;
}

export interface UseVirtualGridOptions<T> {
  items: T[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  rowHeight: number;
  overscan?: number;
  forcedColumns?: number;
}

export interface UseVirtualGridResult<T> {
  columns: number;
  totalHeight: number;
  virtualRows: VirtualRow<T>[];
  totalRows: number;
  totalItems: number;
  renderedItemCount: number;
  firstVisibleIndex: number;
  lastVisibleIndex: number;
  scrollToTop: () => void;
  scrollToIndex: (index: number) => void;
}

export function useVirtualGrid<T>({
  items,
  containerRef,
  rowHeight,
  overscan = 2,
  forcedColumns,
}: UseVirtualGridOptions<T>): UseVirtualGridResult<T> {
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || 1000);
    setContainerHeight(el.clientHeight || 600);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          const { width, height } = entry.contentRect;
          if (width > 0) setContainerWidth(width);
          if (height > 0) setContainerHeight(height);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  const columns = useMemo(() => {
    if (forcedColumns && forcedColumns > 0) return forcedColumns;
    if (containerWidth < 640) return 1;
    if (containerWidth < 768) return 2;
    if (containerWidth < 1024) return 3;
    return 4;
  }, [forcedColumns, containerWidth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
        rafIdRef.current = null;
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [containerRef]);

  const totalRows = useMemo(() => {
    return Math.ceil(items.length / columns);
  }, [items.length, columns]);

  const totalHeight = useMemo(() => {
    return totalRows * rowHeight;
  }, [totalRows, rowHeight]);

  const { virtualRows, firstVisibleIndex, lastVisibleIndex, renderedItemCount } = useMemo(() => {
    if (items.length === 0 || totalRows === 0) {
      return {
        virtualRows: [] as VirtualRow<T>[],
        firstVisibleIndex: 0,
        lastVisibleIndex: 0,
        renderedItemCount: 0,
      };
    }

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const rows: VirtualRow<T>[] = [];
    let count = 0;

    for (let r = startRow; r <= endRow; r++) {
      const startIndex = r * columns;
      const endIndex = Math.min(startIndex + columns, items.length);
      const rowItems = items.slice(startIndex, endIndex);
      count += rowItems.length;

      rows.push({
        rowIndex: r,
        offsetTop: r * rowHeight,
        items: rowItems,
        startIndex,
        endIndex: endIndex - 1,
      });
    }

    const firstIndex = rows.length > 0 ? rows[0].startIndex + 1 : 0;
    const lastIndex = rows.length > 0 ? rows[rows.length - 1].endIndex + 1 : 0;

    return {
      virtualRows: rows,
      firstVisibleIndex: firstIndex,
      lastVisibleIndex: lastIndex,
      renderedItemCount: count,
    };
  }, [items, columns, totalRows, rowHeight, scrollTop, containerHeight, overscan]);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [containerRef]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current && items.length > 0) {
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        const rowIndex = Math.floor(clamped / columns);
        containerRef.current.scrollTo({
          top: rowIndex * rowHeight,
          behavior: 'smooth',
        });
      }
    },
    [containerRef, items.length, columns, rowHeight]
  );

  return {
    columns,
    totalHeight,
    virtualRows,
    totalRows,
    totalItems: items.length,
    renderedItemCount,
    firstVisibleIndex,
    lastVisibleIndex,
    scrollToTop,
    scrollToIndex,
  };
}
