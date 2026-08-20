import { Navigate, Outlet } from "react-router-dom";

import { useSesion } from "../hooks/useSesion";

export function RutaSoloInvitados() {
  const { StrEstado } = useSesion();
  return StrEstado === "autenticada" ? <Navigate to="/inicio" replace /> : <Outlet />;
}
