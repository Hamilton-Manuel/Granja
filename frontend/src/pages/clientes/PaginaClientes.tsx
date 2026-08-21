import { useState, type FormEvent } from "react";

import { FormularioCliente } from "../../components/clientes/FormularioCliente";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { MensajeError } from "../../components/ui/MensajeError";
import { Modal } from "../../components/ui/Modal";
import { Paginacion } from "../../components/ui/Paginacion";
import { useClientes } from "../../hooks/useClientes";
import { useSesion } from "../../hooks/useSesion";
import type { CambiosCliente, Cliente, DatosCliente } from "../../types/clientes.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import "../../styles/contrapartes.css";

export function PaginaClientes() {
  const ObjModulo = useClientes();
  const { Autenticacion_tienePermiso } = useSesion();
  const [StrBusqueda, establecerBusqueda] = useState("");
  const [StrEstado, establecerEstado] = useState("");
  const [StrTipo, establecerTipo] = useState("");
  const [BoolCrear, establecerCrear] = useState(false);
  const [ObjEditar, establecerEditar] = useState<Cliente | null>(null);
  const [ObjEstado, establecerObjEstado] = useState<Cliente | null>(null);
  const BoolPuedeCrear = Autenticacion_tienePermiso("CLIENTES_CREAR");
  const BoolPuedeEditar = Autenticacion_tienePermiso("CLIENTES_EDITAR");
  const BoolPuedeEstado = Autenticacion_tienePermiso("CLIENTES_CAMBIAR_ESTADO");
  const BoolProcesando = ObjModulo.StrOperacion !== null;

  function Clientes_buscar(ObjEvento: FormEvent) {
    ObjEvento.preventDefault();
    ObjModulo.Clientes_aplicarFiltros({
      ...(StrBusqueda.trim() ? { busqueda: StrBusqueda.trim() } : {}),
      ...(StrEstado ? { estado: StrEstado as "ACTIVO" | "INACTIVO" } : {}),
      ...(StrTipo ? { tipoClienteId: Number(StrTipo) } : {}),
    });
  }

  function Clientes_limpiar() {
    establecerBusqueda("");
    establecerEstado("");
    establecerTipo("");
    ObjModulo.Clientes_aplicarFiltros({});
  }

  async function Clientes_guardarCrear(ObjDatos: DatosCliente | CambiosCliente) {
    await ObjModulo.Clientes_crear(ObjDatos as DatosCliente);
    establecerCrear(false);
  }

  async function Clientes_guardarEditar(ObjDatos: DatosCliente | CambiosCliente) {
    if (!ObjEditar) return;
    await ObjModulo.Clientes_editar(ObjEditar.clienteId, ObjDatos as CambiosCliente);
    establecerEditar(null);
  }

  async function Clientes_confirmarEstado() {
    if (!ObjEstado) return;
    try {
      await ObjModulo.Clientes_cambiarEstado(ObjEstado.clienteId, !ObjEstado.activo);
      establecerObjEstado(null);
    } catch {
      // El hook publica el error sanitizado.
    }
  }

  if (ObjModulo.BoolCargaInicial) return <div className="contrapartes-cargando" role="status">Cargando clientes...</div>;

  const IntPaginas = Math.max(1, Math.ceil(ObjModulo.IntTotal / ObjModulo.IntLimite));

  return (
    <section className="pagina-contrapartes">
      <header className="contrapartes-encabezado">
        <div><p className="etiqueta">Administracion</p><h1>Clientes</h1><p>Gestione las contrapartes utilizadas por ventas y trazabilidad.</p></div>
        {BoolPuedeCrear && <button className="boton-primario" type="button" onClick={() => establecerCrear(true)}>Nuevo cliente</button>}
      </header>
      <form className="contrapartes-filtros" onSubmit={Clientes_buscar}>
        <div className="campo-filtro"><label htmlFor="buscar-clientes">Buscar</label><input id="buscar-clientes" value={StrBusqueda} maxLength={200} placeholder="Codigo, nombre, NIT, DPI o correo" onChange={(ObjEvento) => establecerBusqueda(ObjEvento.target.value)} /></div>
        <div className="campo-filtro"><label htmlFor="estado-clientes">Estado</label><select id="estado-clientes" value={StrEstado} onChange={(ObjEvento) => establecerEstado(ObjEvento.target.value)}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
        <div className="campo-filtro"><label htmlFor="tipo-clientes">Tipo</label><select id="tipo-clientes" value={StrTipo} onChange={(ObjEvento) => establecerTipo(ObjEvento.target.value)}><option value="">Todos</option>{ObjModulo.ArrTipos.map((ObjTipo) => <option key={ObjTipo.tipoClienteId} value={ObjTipo.tipoClienteId}>{ObjTipo.nombre}</option>)}</select></div>
        <div className="filtros-acciones"><button className="boton-primario" type="submit">Buscar</button><button className="boton-secundario" type="button" onClick={Clientes_limpiar}>Limpiar</button></div>
      </form>
      {ObjModulo.StrError && <MensajeError StrMensaje={ObjModulo.StrError} />}
      {ObjModulo.StrExito && <div className="mensaje-exito" role="status">{ObjModulo.StrExito}</div>}
      {ObjModulo.BoolActualizando && <p role="status">Actualizando resultados...</p>}
      {ObjModulo.ArrClientes.length === 0 ? (
        <div className="contrapartes-vacio"><h2>No se encontraron clientes</h2><p>Pruebe con otros criterios de busqueda.</p></div>
      ) : (
        <>
          <div className="contrapartes-tabla-contenedor">
            <table className="contrapartes-tabla">
              <thead><tr><th>Codigo</th><th>Nombre</th><th>Tipo</th><th>DPI</th><th>NIT</th><th>Telefono</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>{ObjModulo.ArrClientes.map((ObjItem) => <tr key={ObjItem.clienteId}><td><strong>{ObjItem.codigo}</strong></td><td>{ObjItem.nombreCompleto}</td><td>{ObjItem.tipo.nombre}</td><td>{ObjItem.numeroDocumento || "—"}</td><td>{ObjItem.nit || "—"}</td><td>{ObjItem.telefono || "—"}</td><td><InsigniaEstado StrEstado={ObjItem.activo ? "ACTIVO" : "INACTIVO"} /></td><td><div className="acciones-contraparte">{BoolPuedeEditar && <button type="button" aria-label={`Editar ${ObjItem.codigo}`} onClick={() => establecerEditar(ObjItem)}>Editar</button>}{BoolPuedeEstado && <button type="button" aria-label={`${ObjItem.activo ? "Inactivar" : "Activar"} ${ObjItem.codigo}`} onClick={() => establecerObjEstado(ObjItem)}>{ObjItem.activo ? "Inactivar" : "Activar"}</button>}</div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="contrapartes-tarjetas">{ObjModulo.ArrClientes.map((ObjItem) => <article className="contraparte-tarjeta" key={ObjItem.clienteId}><div><strong>{ObjItem.codigo}</strong><InsigniaEstado StrEstado={ObjItem.activo ? "ACTIVO" : "INACTIVO"} /></div><h2>{ObjItem.nombreCompleto}</h2><p>{ObjItem.tipo.nombre}</p><dl><div><dt>DPI</dt><dd>{ObjItem.numeroDocumento || "—"}</dd></div><div><dt>NIT</dt><dd>{ObjItem.nit || "—"}</dd></div><div><dt>Telefono</dt><dd>{ObjItem.telefono || "—"}</dd></div><div><dt>Creacion</dt><dd>{Fecha_formatearTimestampGuatemala(ObjItem.fechaCreacion)}</dd></div></dl><div className="acciones-contraparte">{BoolPuedeEditar && <button type="button" onClick={() => establecerEditar(ObjItem)}>Editar {ObjItem.codigo}</button>}{BoolPuedeEstado && <button type="button" onClick={() => establecerObjEstado(ObjItem)}>{ObjItem.activo ? "Inactivar" : "Activar"} {ObjItem.codigo}</button>}</div></article>)}</div>
          <Paginacion IntPagina={ObjModulo.IntPagina} IntTotalPaginas={IntPaginas} BoolDeshabilitada={ObjModulo.BoolActualizando} Usuarios_cambiarPagina={ObjModulo.establecerPagina} />
        </>
      )}
      <Modal BoolAbierto={BoolCrear} StrTitulo="Nuevo cliente" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerCrear(false); }}>{BoolCrear && <FormularioCliente StrModo="crear" ArrTipos={ObjModulo.ArrTiposActivos} BoolProcesando={ObjModulo.StrOperacion === "crear"} Clientes_cancelar={() => establecerCrear(false)} Clientes_guardar={Clientes_guardarCrear} />}</Modal>
      <Modal BoolAbierto={ObjEditar !== null} StrTitulo="Editar cliente" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerEditar(null); }}>{ObjEditar && <FormularioCliente StrModo="editar" ObjCliente={ObjEditar} ArrTipos={ObjModulo.ArrTiposActivos} BoolProcesando={ObjModulo.StrOperacion === `editar-${ObjEditar.clienteId}`} Clientes_cancelar={() => establecerEditar(null)} Clientes_guardar={Clientes_guardarEditar} />}</Modal>
      <DialogoConfirmacion BoolAbierto={ObjEstado !== null} StrTitulo={`${ObjEstado?.activo ? "Inactivar" : "Activar"} cliente`} StrMensaje={ObjEstado?.activo ? "El cliente conservara todo su historial y dejara de estar disponible para operaciones futuras cuando los modulos consumidores apliquen esta regla." : "El cliente podra utilizarse nuevamente en operaciones futuras."} StrConfirmar={ObjEstado?.activo ? "Inactivar" : "Activar"} BoolProcesando={ObjEstado !== null && ObjModulo.StrOperacion === `estado-${ObjEstado.clienteId}`} Autenticacion_cancelar={() => establecerObjEstado(null)} Autenticacion_confirmar={() => void Clientes_confirmarEstado()} />
    </section>
  );
}
