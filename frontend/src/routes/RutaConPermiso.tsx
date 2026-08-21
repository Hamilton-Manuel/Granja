import { Link, Outlet } from "react-router-dom";
import { useSesion } from "../hooks/useSesion";

interface PropiedadesRutaConPermiso { StrPermiso?: string; ArrPermisosAlguno?: string[] }
export function RutaConPermiso({ StrPermiso, ArrPermisosAlguno = [] }: PropiedadesRutaConPermiso) {
  const { Autenticacion_tienePermiso } = useSesion();
  const BoolAutorizada = (StrPermiso !== undefined && Autenticacion_tienePermiso(StrPermiso)) || ArrPermisosAlguno.some(Autenticacion_tienePermiso);
  if (BoolAutorizada) return <Outlet />;
  return <section className="acceso-denegado" role="alert"><p className="etiqueta">Acceso restringido</p><h1>Permiso insuficiente</h1><p>No tiene permiso para acceder a este módulo.</p><Link className="boton-secundario enlace-boton" to="/inicio">Volver a Inicio</Link></section>;
}
