import { NavLink } from "react-router-dom";

import { useSesion } from "../hooks/useSesion";

interface PropiedadesMenuLateral {
  BoolAbierto: boolean;
  Autenticacion_cerrarMenu: () => void;
}

export function MenuLateral({ BoolAbierto, Autenticacion_cerrarMenu }: PropiedadesMenuLateral) {
  const { Autenticacion_tienePermiso } = useSesion();
  const BoolMostrarUsuarios = Autenticacion_tienePermiso("USUARIOS_CONSULTAR");
  const BoolMostrarAccesos = Autenticacion_tienePermiso("USUARIOS_ASIGNAR_ROL");
  const BoolMostrarClientes = Autenticacion_tienePermiso("CLIENTES_CONSULTAR");
  const BoolMostrarProveedores = Autenticacion_tienePermiso("PROVEEDORES_CONSULTAR");
  const BoolMostrarInventario = Autenticacion_tienePermiso("INVENTARIO_CONSULTAR");
  const BoolMostrarProduccion = Autenticacion_tienePermiso("PRODUCCION_CONSULTAR");
  const BoolMostrarAlimentacion = Autenticacion_tienePermiso("ALIMENTACION_CONSULTAR");
  const BoolMostrarSanidad = Autenticacion_tienePermiso("SANIDAD_CONSULTAR");
  const BoolMostrarVentas = Autenticacion_tienePermiso("VENTAS_CONSULTAR");
  const BoolMostrarReportes = ["REPORTES_INVENTARIO_CONSULTAR", "REPORTES_PRODUCCION_CONSULTAR", "REPORTES_SANIDAD_CONSULTAR", "REPORTES_VENTAS_CONSULTAR", "REPORTES_COSTOS_CONSULTAR"].some(Autenticacion_tienePermiso);

  return (
    <>
      <button
        className={`menu-fondo ${BoolAbierto ? "menu-fondo--visible" : ""}`}
        type="button"
        aria-label="Cerrar menú"
        onClick={Autenticacion_cerrarMenu}
      />
      <aside className={`menu-lateral ${BoolAbierto ? "menu-lateral--abierto" : ""}`} aria-label="Navegación principal">
        <div className="marca">
          <span className="marca-sello" aria-hidden="true">EC</span>
          <div>
            <strong>El Chiflón</strong>
            <span>Gestión de granja</span>
          </div>
        </div>
        <nav className="menu-navegacion">
          <NavLink
            to="/inicio"
            className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`}
            onClick={Autenticacion_cerrarMenu}
          >
            <span aria-hidden="true">⌂</span> Inicio
          </NavLink>
          {BoolMostrarUsuarios && (
            <NavLink to="/usuarios" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}>
              <span aria-hidden="true">♙</span> Usuarios
            </NavLink>
          )}
          {BoolMostrarAccesos && <NavLink to="/accesos" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">A</span> Accesos</NavLink>}
          {BoolMostrarClientes && <NavLink to="/clientes" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">C</span> Clientes</NavLink>}
          {BoolMostrarProveedores && <NavLink to="/proveedores" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">P</span> Proveedores</NavLink>}
          {BoolMostrarInventario && <NavLink to="/inventario" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">I</span> Inventario</NavLink>}
          {BoolMostrarProduccion && <NavLink to="/produccion" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">P</span> Producción</NavLink>}
          {BoolMostrarAlimentacion && <NavLink to="/alimentacion" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">A</span> Alimentación</NavLink>}
          {BoolMostrarSanidad && <NavLink to="/sanidad" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">S</span> Sanidad</NavLink>}
          {BoolMostrarVentas && <NavLink to="/ventas" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">V</span> Ventas</NavLink>}
          {BoolMostrarReportes && <NavLink to="/reportes" className={({ isActive: BoolActivo }) => `menu-opcion ${BoolActivo ? "menu-opcion--activa" : ""}`} onClick={Autenticacion_cerrarMenu}><span aria-hidden="true">R</span> Reportes</NavLink>}
        </nav>
        <div className="menu-pie">Rabinal, Baja Verapaz</div>
      </aside>
    </>
  );
}
