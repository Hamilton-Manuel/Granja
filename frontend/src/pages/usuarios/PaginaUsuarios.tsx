import { useState, type FormEvent, type ReactNode } from "react";

import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { MensajeError } from "../../components/ui/MensajeError";
import { Modal } from "../../components/ui/Modal";
import { Paginacion } from "../../components/ui/Paginacion";
import { FormularioUsuario } from "../../components/usuarios/FormularioUsuario";
import { useSesion } from "../../hooks/useSesion";
import { useUsuarios } from "../../hooks/useUsuarios";
import type { ConsultaUsuarios, DatosCrearUsuario, DatosEditarUsuario, EstadoUsuario, UsuarioAdministrativo } from "../../types/usuarios.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import "../../styles/usuarios.css";

type ConfirmacionUsuario = { StrTipo: "estado" | "sesiones"; ObjUsuario: UsuarioAdministrativo } | null;

export function PaginaUsuarios() {
  const ObjModulo = useUsuarios();
  const { ObjUsuario, Autenticacion_tienePermiso } = useSesion();
  const [StrBusqueda, establecerBusqueda] = useState("");
  const [StrEstado, establecerEstado] = useState<"" | EstadoUsuario>("");
  const [StrRolId, establecerRolId] = useState("");
  const [BoolCrear, establecerCrear] = useState(false);
  const [ObjEditar, establecerEditar] = useState<UsuarioAdministrativo | null>(null);
  const [ObjCambiarRol, establecerCambiarRol] = useState<UsuarioAdministrativo | null>(null);
  const [IntNuevoRolId, establecerNuevoRolId] = useState(0);
  const [ObjConfirmacion, establecerConfirmacion] = useState<ConfirmacionUsuario>(null);

  const BoolPuedeCrear = Autenticacion_tienePermiso("USUARIOS_CREAR") && ObjModulo.BoolPuedeCatalogos;
  const BoolPuedeEditar = Autenticacion_tienePermiso("USUARIOS_EDITAR");
  const BoolPuedeEstado = Autenticacion_tienePermiso("USUARIOS_CAMBIAR_ESTADO");
  const BoolPuedeRol = Autenticacion_tienePermiso("USUARIOS_ASIGNAR_ROL") && ObjModulo.BoolPuedeCatalogos;
  const BoolPuedeSesiones = Autenticacion_tienePermiso("USUARIOS_REVOCAR_SESIONES");

  function Usuarios_aplicarBusqueda(ObjEvento: FormEvent): void {
    ObjEvento.preventDefault();
    const ObjFiltros: Omit<ConsultaUsuarios, "pagina" | "limite"> = {};
    if (StrBusqueda.trim()) ObjFiltros.busqueda = StrBusqueda.trim();
    if (StrEstado) ObjFiltros.estado = StrEstado;
    if (StrRolId) ObjFiltros.rolId = Number(StrRolId);
    ObjModulo.Usuarios_aplicarFiltros(ObjFiltros);
  }

  function Usuarios_limpiarFiltros(): void {
    establecerBusqueda(""); establecerEstado(""); establecerRolId("");
    ObjModulo.Usuarios_aplicarFiltros({});
  }

  function Usuarios_esPropio(ObjObjetivo: UsuarioAdministrativo): boolean {
    return ObjObjetivo.usuarioId === ObjUsuario?.usuarioId;
  }

  function Usuarios_esWebmaster(ObjObjetivo: UsuarioAdministrativo): boolean {
    return ObjObjetivo.rol.nombre === "WEBMASTER";
  }

  function Usuarios_renderizarAcciones(ObjObjetivo: UsuarioAdministrativo): ReactNode {
    const BoolPropio = Usuarios_esPropio(ObjObjetivo);
    const BoolWebmaster = Usuarios_esWebmaster(ObjObjetivo);
    const BoolProtegidoAjeno = BoolWebmaster && !BoolPropio;
    if (BoolProtegidoAjeno) return <span className="acciones-no-disponibles">Cuenta protegida</span>;
    return (
      <div className="acciones-usuario">
        {BoolPuedeEditar && <button type="button" onClick={() => establecerEditar(ObjObjetivo)} aria-label={`Editar a ${ObjObjetivo.nombreCompleto}`}>Editar</button>}
        {BoolPuedeEstado && !BoolPropio && !BoolWebmaster && <button type="button" onClick={() => establecerConfirmacion({ StrTipo: "estado", ObjUsuario: ObjObjetivo })} aria-label={`${ObjObjetivo.estado === "ACTIVO" ? "Desactivar" : "Activar"} a ${ObjObjetivo.nombreCompleto}`}>{ObjObjetivo.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
        {BoolPuedeRol && !BoolPropio && !BoolWebmaster && <button type="button" onClick={() => { establecerNuevoRolId(ObjObjetivo.rol.rolId); establecerCambiarRol(ObjObjetivo); }} aria-label={`Cambiar rol de ${ObjObjetivo.nombreCompleto}`}>Rol</button>}
        {BoolPuedeSesiones && <button type="button" onClick={() => establecerConfirmacion({ StrTipo: "sesiones", ObjUsuario: ObjObjetivo })} aria-label={`Revocar sesiones de ${ObjObjetivo.nombreCompleto}`}>Sesiones</button>}
      </div>
    );
  }

  async function Usuarios_guardarCreacion(ObjDatos: DatosCrearUsuario | DatosEditarUsuario): Promise<void> {
    await ObjModulo.Usuarios_crear(ObjDatos as DatosCrearUsuario);
    establecerCrear(false);
  }

  async function Usuarios_guardarEdicion(ObjDatos: DatosCrearUsuario | DatosEditarUsuario): Promise<void> {
    if (ObjEditar === null) return;
    await ObjModulo.Usuarios_editar(ObjEditar.usuarioId, ObjDatos as DatosEditarUsuario);
    establecerEditar(null);
  }

  async function Usuarios_confirmarAccion(): Promise<void> {
    if (ObjConfirmacion === null) return;
    try {
      if (ObjConfirmacion.StrTipo === "estado") {
        const StrNuevoEstado = ObjConfirmacion.ObjUsuario.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        await ObjModulo.Usuarios_cambiarEstado(ObjConfirmacion.ObjUsuario.usuarioId, StrNuevoEstado);
      } else {
        await ObjModulo.Usuarios_revocar(ObjConfirmacion.ObjUsuario.usuarioId);
      }
      establecerConfirmacion(null);
    } catch {
      // El hook conserva el error sanitizado y el diálogo abierto para reintentar.
    }
  }

  async function Usuarios_guardarRol(ObjEvento: FormEvent): Promise<void> {
    ObjEvento.preventDefault();
    if (ObjCambiarRol === null || IntNuevoRolId <= 0) return;
    try {
      await ObjModulo.Usuarios_cambiarRol(ObjCambiarRol.usuarioId, IntNuevoRolId);
      establecerCambiarRol(null);
    } catch {
      // El hook conserva el error sanitizado y el modal abierto para corregirlo.
    }
  }

  if (ObjModulo.BoolCargaInicial) return <div className="usuarios-cargando" role="status">Cargando usuarios…</div>;
  const IntTotalPaginas = Math.max(1, Math.ceil(ObjModulo.IntTotal / ObjModulo.IntLimite));
  const BoolProcesando = ObjModulo.StrOperacion !== null;

  return (
    <section className="pagina-usuarios">
      <header className="usuarios-encabezado">
        <div><p className="etiqueta">Administración</p><h1>Usuarios</h1><p>Gestione las cuentas y sus accesos al sistema.</p></div>
        {BoolPuedeCrear && <button type="button" className="boton-primario" onClick={() => establecerCrear(true)}>Nuevo usuario</button>}
      </header>

      <form className="usuarios-filtros" onSubmit={Usuarios_aplicarBusqueda}>
        <div className="campo-filtro"><label htmlFor="buscar-usuarios">Buscar</label><input id="buscar-usuarios" value={StrBusqueda} maxLength={200} placeholder="Nombre, usuario o correo" onChange={(ObjEvento) => establecerBusqueda(ObjEvento.target.value)} /></div>
        <div className="campo-filtro"><label htmlFor="estado-usuarios">Estado</label><select id="estado-usuarios" value={StrEstado} onChange={(ObjEvento) => establecerEstado(ObjEvento.target.value as "" | EstadoUsuario)}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
        {ObjModulo.BoolPuedeCatalogos && <div className="campo-filtro"><label htmlFor="rol-usuarios">Rol</label><select id="rol-usuarios" value={StrRolId} onChange={(ObjEvento) => establecerRolId(ObjEvento.target.value)}><option value="">Todos</option>{ObjModulo.ArrRoles.map((ObjRol) => <option key={ObjRol.rolId} value={ObjRol.rolId}>{ObjRol.nombre}</option>)}</select></div>}
        <div className="filtros-acciones"><button className="boton-primario" type="submit" disabled={ObjModulo.BoolActualizando}>Buscar</button><button className="boton-secundario" type="button" onClick={Usuarios_limpiarFiltros}>Limpiar</button></div>
      </form>

      {ObjModulo.StrError && <MensajeError StrMensaje={ObjModulo.StrError} />}
      {ObjModulo.StrExito && <div className="mensaje-exito" role="status">{ObjModulo.StrExito}</div>}
      {ObjModulo.BoolActualizando && <p className="usuarios-actualizando" role="status">Actualizando resultados…</p>}

      {ObjModulo.ArrUsuarios.length === 0 ? (
        <div className="usuarios-vacio"><h2>No se encontraron usuarios</h2><p>Pruebe con otros criterios de búsqueda.</p></div>
      ) : (
        <>
          <div className="usuarios-tabla-contenedor">
            <table className="usuarios-tabla"><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creación</th><th>Acciones</th></tr></thead>
              <tbody>{ObjModulo.ArrUsuarios.map((ObjItem) => <tr key={ObjItem.usuarioId}><td><strong>{ObjItem.nombreCompleto}</strong></td><td>{ObjItem.nombreUsuario}</td><td>{ObjItem.correo}</td><td>{ObjItem.rol.nombre}</td><td><InsigniaEstado StrEstado={ObjItem.estado} /></td><td>{Fecha_formatearTimestampGuatemala(ObjItem.fechaCreacion)}</td><td>{Usuarios_renderizarAcciones(ObjItem)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="usuarios-tarjetas">{ObjModulo.ArrUsuarios.map((ObjItem) => <article className="usuario-tarjeta" key={ObjItem.usuarioId}><div className="usuario-tarjeta-cabecera"><div><h2>{ObjItem.nombreCompleto}</h2><span>@{ObjItem.nombreUsuario}</span></div><InsigniaEstado StrEstado={ObjItem.estado} /></div><dl><div><dt>Correo</dt><dd>{ObjItem.correo}</dd></div><div><dt>Rol</dt><dd>{ObjItem.rol.nombre}</dd></div><div><dt>Creación</dt><dd>{Fecha_formatearTimestampGuatemala(ObjItem.fechaCreacion)}</dd></div></dl>{Usuarios_renderizarAcciones(ObjItem)}</article>)}</div>
          <Paginacion IntPagina={ObjModulo.IntPagina} IntTotalPaginas={IntTotalPaginas} BoolDeshabilitada={ObjModulo.BoolActualizando} Usuarios_cambiarPagina={ObjModulo.establecerPagina} />
        </>
      )}

      <Modal BoolAbierto={BoolCrear} StrTitulo="Nuevo usuario" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerCrear(false); }}>{BoolCrear && <FormularioUsuario StrModo="crear" ArrRoles={ObjModulo.ArrRolesAsignables} BoolProcesando={ObjModulo.StrOperacion === "crear"} Usuarios_cancelar={() => establecerCrear(false)} Usuarios_guardar={Usuarios_guardarCreacion} />}</Modal>
      <Modal BoolAbierto={ObjEditar !== null} StrTitulo="Editar usuario" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerEditar(null); }}>{ObjEditar && <FormularioUsuario StrModo="editar" ObjUsuario={ObjEditar} BoolProcesando={ObjModulo.StrOperacion === `editar-${ObjEditar.usuarioId}`} Usuarios_cancelar={() => establecerEditar(null)} Usuarios_guardar={Usuarios_guardarEdicion} />}</Modal>
      <Modal BoolAbierto={ObjCambiarRol !== null} StrTitulo="Cambiar rol" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerCambiarRol(null); }}>{ObjCambiarRol && <form onSubmit={(ObjEvento) => void Usuarios_guardarRol(ObjEvento)}><p>Rol actual: <strong>{ObjCambiarRol.rol.nombre}</strong></p><p className="advertencia">Cambiar el rol revocará las sesiones activas de esta cuenta.</p><div className="campo-formulario"><label htmlFor="nuevo-rol">Nuevo rol</label><select id="nuevo-rol" value={IntNuevoRolId} onChange={(ObjEvento) => establecerNuevoRolId(Number(ObjEvento.target.value))}>{ObjModulo.ArrRolesAsignables.map((ObjRol) => <option key={ObjRol.rolId} value={ObjRol.rolId}>{ObjRol.nombre}</option>)}</select></div><div className="modal-acciones"><button type="button" className="boton-secundario" onClick={() => establecerCambiarRol(null)}>Cancelar</button><button type="submit" className="boton-primario" disabled={ObjModulo.StrOperacion === `rol-${ObjCambiarRol.usuarioId}`}>Cambiar rol</button></div></form>}</Modal>
      <DialogoConfirmacion BoolAbierto={ObjConfirmacion !== null} StrTitulo={ObjConfirmacion?.StrTipo === "estado" ? "Confirmar cambio de estado" : "Revocar sesiones"} StrMensaje={ObjConfirmacion?.StrTipo === "estado" ? `${ObjConfirmacion.ObjUsuario.estado === "ACTIVO" ? "Desactivar" : "Activar"} a ${ObjConfirmacion.ObjUsuario.nombreCompleto}. Al desactivar perderá acceso y se revocarán sus sesiones activas.` : ObjConfirmacion && Usuarios_esPropio(ObjConfirmacion.ObjUsuario) ? "Se revocarán todas sus sesiones, incluida la actual, y deberá iniciar sesión nuevamente." : `Se revocarán todas las sesiones activas de ${ObjConfirmacion?.ObjUsuario.nombreCompleto ?? "este usuario"}.`} StrConfirmar={ObjConfirmacion?.StrTipo === "estado" ? "Confirmar" : "Revocar sesiones"} BoolProcesando={ObjConfirmacion !== null && ObjModulo.StrOperacion?.endsWith(String(ObjConfirmacion.ObjUsuario.usuarioId)) === true} Autenticacion_cancelar={() => { if (!BoolProcesando) establecerConfirmacion(null); }} Autenticacion_confirmar={() => void Usuarios_confirmarAccion()} />
    </section>
  );
}
