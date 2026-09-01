import{NavLink,Outlet}from"react-router-dom";import{useSesion}from"../../hooks/useSesion";
const Arr=[
 ["Inventario","REPORTES_INVENTARIO_CONSULTAR",[["Existencias","/reportes/inventario/existencias"],["Movimientos","/reportes/inventario/movimientos"]]],
 ["Producción","REPORTES_PRODUCCION_CONSULTAR",[["Censo","/reportes/produccion/censo"],["Altas y salidas","/reportes/produccion/actividad"],["Mediciones","/reportes/produccion/mediciones"]]],
 ["Sanidad","REPORTES_SANIDAD_CONSULTAR",[["Aplicaciones","/reportes/sanidad/aplicaciones"]]],
 ["Ventas","REPORTES_VENTAS_CONSULTAR",[["Ventas","/reportes/ventas"]]],
 ["Costos","REPORTES_COSTOS_CONSULTAR",[["Costos internos","/reportes/costos"]]],
]as const;
export function LayoutReportes(){const{Autenticacion_tienePermiso:P}=useSesion();return <section className="reportes"><header><p className="etiqueta">Consulta y trazabilidad</p><h1>Reportes</h1><p>Información histórica y consolidada, con exportación del conjunto filtrado.</p></header><nav className="reportes-nav" aria-label="Reportes">{Arr.filter(([,Permiso])=>P(Permiso)).map(([Grupo,,Links])=><div key={Grupo}><strong>{Grupo}</strong>{Links.map(([Texto,Ruta])=><NavLink key={Ruta} to={Ruta}>{Texto}</NavLink>)}</div>)}</nav><Outlet/></section>}
