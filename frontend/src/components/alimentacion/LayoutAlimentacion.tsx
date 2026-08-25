import { NavLink, Outlet } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";
export function LayoutAlimentacion() {
  const { Autenticacion_tienePermiso: P } = useSesion();
  const BoolFormulas = [
    "ALIMENTACION_FORMULAS_CREAR",
    "ALIMENTACION_FORMULAS_EDITAR",
    "ALIMENTACION_FORMULAS_CAMBIAR_ESTADO",
  ].some(P);
  return (
    <section className="alimentacion-modulo">
      <header className="alimentacion-modulo-encabezado">
        <p className="etiqueta">Consumo de insumos</p>
        <h1>Alimentación</h1>
        <p>
          Registro y trazabilidad de los alimentos suministrados a Producción.
        </p>
      </header>
      <nav
        className="alimentacion-navegacion"
        aria-label="Secciones de Alimentación"
      >
        <NavLink end to="/alimentacion">
          Historial
        </NavLink>
        {P("ALIMENTACION_REGISTRAR") && (
          <NavLink to="/alimentacion/registrar">Registrar</NavLink>
        )}
        {BoolFormulas && (
          <NavLink to="/alimentacion/formulas">Fórmulas</NavLink>
        )}
        {P("ALIMENTACION_PRODUCTOS_GESTIONAR") && (
          <NavLink to="/alimentacion/productos">Productos</NavLink>
        )}
        {P("ALIMENTACION_RECONCILIACION_EJECUTAR") && (
          <NavLink to="/alimentacion/diagnostico">Diagnóstico</NavLink>
        )}
      </nav>
      <Outlet />
    </section>
  );
}
