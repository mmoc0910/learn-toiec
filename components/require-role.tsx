// src/components/RequireRole.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";

type RoleId = 1 | 2 | 3;

type Props = {
  allowRoles: RoleId[];
  children: React.ReactNode;
  redirectTo?: string;
  forbiddenTo?: string;
};

export function RequireRole({
  allowRoles,
  children,
  redirectTo = "/login",
  forbiddenTo = "/403",
}: Props) {
  const { user, accessToken, isLoading } = useAuth();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // SSR / trước hydrate: render placeholder để tránh redirect sai
  if (!hydrated) return <div />;

  if (isLoading) return <div>Loading...</div>;

  if (!accessToken) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (!allowRoles.includes(user.IDQuyen)) {
    return <Navigate to={forbiddenTo} replace />;
  }

  return <>{children}</>;
}
