import { Link, Outlet } from "react-router-dom";
import { useSesion } from "../hooks/useSesion";

export function RutaConPermiso({ StrPermiso }: { StrPermiso: string }) {
  const { Autenticacion_tienePermiso } = useSesion();
  if (Autenticacion_tienePermiso(StrPermiso)) return <Outlet />;
  return <section className="acceso-denegado" role="alert"><p className="etiqueta">Acceso restringido</p><h1>Permiso insuficiente</h1><p>No tiene permiso para acceder a este módulo.</p><Link className="boton-secundario enlace-boton" to="/inicio">Volver a Inicio</Link></section>;
}
