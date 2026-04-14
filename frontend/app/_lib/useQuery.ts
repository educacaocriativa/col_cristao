"use client";

import { useEffect, useRef, useState } from "react";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = []
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);

  async function run() {
    if (!fetcher) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const seq = ++counter.current;
    try {
      const result = await fetcher();
      if (seq === counter.current) setData(result);
    } catch (err) {
      if (seq === counter.current) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      }
    } finally {
      if (seq === counter.current) setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  return { data, loading, error, refetch: run };
}
