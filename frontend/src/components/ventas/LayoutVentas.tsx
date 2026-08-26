import { NavLink, Outlet } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";

export function LayoutVentas(){const{Autenticacion_tienePermiso}=useSesion();return <section className="ventas-modulo"><header className="ventas-modulo-encabezado"><p className="etiqueta">Comercialización animal</p><h1>Ventas</h1><p>Ventas confirmadas de animales identificados del dominio de Producción.</p></header><nav className="ventas-navegacion" aria-label="Secciones de Ventas"><NavLink end to="/ventas">Historial</NavLink>{Autenticacion_tienePermiso("VENTAS_REGISTRAR")&&<NavLink to="/ventas/registrar">Registrar</NavLink>}{Autenticacion_tienePermiso("VENTAS_RECONCILIACION_EJECUTAR")&&<NavLink to="/ventas/diagnostico">Diagnóstico</NavLink>}</nav><Outlet/></section>}
