import { useContext } from "react";

import { ObjContextoSesion, type ContextoSesion } from "../auth/ProveedorSesion";

export function useSesion(): ContextoSesion {
  const ObjSesion = useContext(ObjContextoSesion);
  if (ObjSesion === null) {
    throw new Error("useSesion debe utilizarse dentro de ProveedorSesion.");
  }
  return ObjSesion;
}
