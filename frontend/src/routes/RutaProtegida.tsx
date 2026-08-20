import { Navigate, Outlet } from "react-router-dom";

import { useSesion } from "../hooks/useSesion";

export function RutaProtegida() {
  const { StrEstado } = useSesion();
  return StrEstado === "autenticada" ? <Outlet /> : <Navigate to="/login" replace />;
}
