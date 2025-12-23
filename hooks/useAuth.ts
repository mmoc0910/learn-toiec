// src/hooks/useAuth.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { getMeApi, loginApi, logoutApi } from "../api/auth.api";
import type { MeResponse } from "../api/auth.api";
import { authStorage } from "utils/libs/https";

type LoginInput = { email: string; password: string };
const isBrowser = () => typeof window !== "undefined";

export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    if (!isBrowser()) return; // SSR: bỏ qua

    const token = authStorage.getAccessToken();
    setAccessToken(token);

    if (!token) {
      setUser(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const me = await getMeApi();
      setUser(me);
    } catch (e: any) {
      setUser(null);
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Không lấy được thông tin người dùng."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    if (!isBrowser()) return null;

    setIsLoading(true);
    setError(null);
    try {
      await loginApi({ Email: input.email, password: input.password });

      const token = authStorage.getAccessToken();
      setAccessToken(token);

      const me = await getMeApi();
      setUser(me);
      return me;
    } catch (e: any) {
      setUser(null);
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Đăng nhập thất bại."
      );
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    if (!isBrowser()) return;
    logoutApi();
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => {
    // chỉ chạy ở client
    refreshMe();
  }, [refreshMe]);

  return useMemo(
    () => ({ accessToken, user, isLoading, error, login, logout, refreshMe }),
    [accessToken, user, isLoading, error, login, logout, refreshMe]
  );
}
