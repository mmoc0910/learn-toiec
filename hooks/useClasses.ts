// src/hooks/useClasses.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClassesApi, type LopHoc } from "../api/classes.api";

const isBrowser = () => typeof window !== "undefined";

export function useClasses() {
  const [data, setData] = useState<LopHoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!isBrowser()) return; // SSR safe
    setIsLoading(true);
    setError(null);
    try {
      const res = await getClassesApi();
      setData(res.results ?? []);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Không tải được danh sách lớp."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return useMemo(
    () => ({ classes: data, isLoading, error, refetch: fetchClasses }),
    [data, isLoading, error, fetchClasses]
  );
}
