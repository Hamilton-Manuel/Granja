import { NavLink, Outlet } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";

export function LayoutInventario() {
  const { Autenticacion_tienePermiso } = useSesion();
  const BoolCatalogos = ["INVENTARIO_CATEGORIAS_CREAR", "INVENTARIO_CATEGORIAS_EDITAR", "INVENTARIO_CATEGORIAS_CAMBIAR_ESTADO", "INVENTARIO_ALMACENES_CREAR", "INVENTARIO_ALMACENES_EDITAR", "INVENTARIO_ALMACENES_CAMBIAR_ESTADO", "INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR"].some(Autenticacion_tienePermiso);
  return <section className="inventario-modulo"><header className="inventario-modulo-encabezado"><div><p className="etiqueta">Insumos operativos</p><h1>Inventario</h1><p>Existencias, lotes y movimientos de los insumos utilizados por la granja.</p></div></header><nav className="inventario-navegacion" aria-label="Secciones de Inventario"><NavLink end to="/inventario">Resumen</NavLink><NavLink to="/inventario/productos">Productos y existencias</NavLink><NavLink to="/inventario/lotes">Lotes</NavLink><NavLink to="/inventario/movimientos">Movimientos</NavLink><NavLink to="/inventario/transferencias">Transferencias</NavLink>{BoolCatalogos && <NavLink to="/inventario/catalogos">Catálogos</NavLink>}{Autenticacion_tienePermiso("INVENTARIO_RECONCILIACION_EJECUTAR") && <NavLink to="/inventario/diagnostico">Diagnóstico</NavLink>}</nav><Outlet /></section>;
}
