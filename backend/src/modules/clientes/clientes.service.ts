import { Prisma } from "../../../generated/prisma/client.js";

import { Fecha_convertirAlmacenamientoGuatemalaAInstante, Fecha_formatearInstanteGuatemala } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Clientes_canonicalizarIdentificacion } from "./clientes.constants.js";
import * as ObjRepositorio from "./clientes.repository.js";

function Clientes_formatear<T extends { fechaCreacion: Date; fechaActualizacion: Date }>(ObjCliente: T) {
  return { ...ObjCliente, fechaCreacion: Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(ObjCliente.fechaCreacion)), fechaActualizacion: Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(ObjCliente.fechaActualizacion)) };
}

function Clientes_lanzarErrorPersistencia(ObjError: unknown): never {
  if (ObjError instanceof Prisma.PrismaClientKnownRequestError && ObjError.code === "P2002") {
    const StrDetalle = JSON.stringify(ObjError.meta ?? {}).toLowerCase() + ObjError.message.toLowerCase();
    if (StrDetalle.includes("nit")) throw new ErrorAplicacion(409, "NIT_DUPLICADO", "El NIT ya esta registrado.");
    if (StrDetalle.includes("documento")) throw new ErrorAplicacion(409, "DOCUMENTO_DUPLICADO", "El documento ya esta registrado.");
    if (StrDetalle.includes("codigo")) throw new ErrorAplicacion(409, "CODIGO_DUPLICADO", "No fue posible asignar un codigo unico.");
  }
  throw ObjError;
}

async function Clientes_validarTipo(IntTipoClienteId: number): Promise<void> {
  const ObjTipo = await ObjRepositorio.Clientes_obtenerTipo(IntTipoClienteId);
  if (ObjTipo === null) throw new ErrorAplicacion(404, "TIPO_CLIENTE_NO_ENCONTRADO", "El tipo de cliente no existe.");
  if (!ObjTipo.activo) throw new ErrorAplicacion(409, "TIPO_CLIENTE_INACTIVO", "El tipo de cliente esta inactivo.");
}

export function Clientes_validarDocumento(StrDocumento: string | null): void {
  if (StrDocumento === "CF") {
    throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "CF no es un documento valido.");
  }
}

export async function Clientes_listar(ObjConsulta: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; StrEstado?: "ACTIVO" | "INACTIVO" | undefined; IntTipoClienteId?: number | undefined }) {
  const ObjResultado = await ObjRepositorio.Clientes_listarRegistros({ IntPagina: ObjConsulta.IntPagina, IntLimite: ObjConsulta.IntLimite, StrBusqueda: ObjConsulta.StrBusqueda, BoolActivo: ObjConsulta.StrEstado === undefined ? undefined : ObjConsulta.StrEstado === "ACTIVO", IntTipoClienteId: ObjConsulta.IntTipoClienteId });
  return { ArrClientes: ObjResultado.ArrClientes.map(Clientes_formatear), IntTotal: ObjResultado.IntTotal };
}

export async function Clientes_obtenerPorId(IntClienteId: number) {
  const ObjCliente = await ObjRepositorio.Clientes_obtenerRegistro(IntClienteId);
  if (ObjCliente === null) throw new ErrorAplicacion(404, "CLIENTE_NO_ENCONTRADO", "El cliente no existe.");
  return Clientes_formatear(ObjCliente);
}

export function Clientes_obtenerTipos() { return ObjRepositorio.Clientes_listarTipos(); }

export async function Clientes_crear(ObjDatos: { IntTipoClienteId: number; StrNombreCompleto: string; StrNumeroDocumento?: string | null | undefined; StrNit?: string | null | undefined; StrTelefono?: string | null | undefined; StrCorreo?: string | null | undefined; StrDireccion?: string | null | undefined; StrObservaciones?: string | null | undefined; IntUsuarioActorId: number; StrDireccionIp?: string | undefined }) {
  await Clientes_validarTipo(ObjDatos.IntTipoClienteId);
  const StrDocumento = Clientes_canonicalizarIdentificacion(ObjDatos.StrNumeroDocumento);
  Clientes_validarDocumento(StrDocumento);
  try {
    return Clientes_formatear(await ObjRepositorio.Clientes_crearRegistro({ tipoClienteId: ObjDatos.IntTipoClienteId, nombreCompleto: ObjDatos.StrNombreCompleto, numeroDocumento: StrDocumento, nit: Clientes_canonicalizarIdentificacion(ObjDatos.StrNit), telefono: ObjDatos.StrTelefono?.trim() || null, correo: ObjDatos.StrCorreo?.trim() || null, direccion: ObjDatos.StrDireccion?.trim() || null, observaciones: ObjDatos.StrObservaciones?.trim() || null, IntUsuarioActorId: ObjDatos.IntUsuarioActorId, StrDireccionIp: ObjDatos.StrDireccionIp }));
  } catch (ObjError) { Clientes_lanzarErrorPersistencia(ObjError); }
}

export async function Clientes_editar(ObjDatos: { IntClienteId: number; IntTipoClienteId?: number | undefined; StrNombreCompleto?: string | undefined; StrNumeroDocumento?: string | null | undefined; StrNit?: string | null | undefined; StrTelefono?: string | null | undefined; StrCorreo?: string | null | undefined; StrDireccion?: string | null | undefined; StrObservaciones?: string | null | undefined; IntUsuarioActorId: number; StrDireccionIp?: string | undefined }) {
  await Clientes_obtenerPorId(ObjDatos.IntClienteId);
  if (ObjDatos.IntTipoClienteId !== undefined) await Clientes_validarTipo(ObjDatos.IntTipoClienteId);
  const ObjActualizacion: Prisma.ClienteRegistroUncheckedUpdateInput = {};
  if (ObjDatos.IntTipoClienteId !== undefined) ObjActualizacion.tipoClienteId = ObjDatos.IntTipoClienteId;
  if (ObjDatos.StrNombreCompleto !== undefined) ObjActualizacion.nombreCompleto = ObjDatos.StrNombreCompleto;
  if (ObjDatos.StrNumeroDocumento !== undefined) {
    const StrDocumento = Clientes_canonicalizarIdentificacion(ObjDatos.StrNumeroDocumento);
    Clientes_validarDocumento(StrDocumento);
    ObjActualizacion.numeroDocumento = StrDocumento;
  }
  if (ObjDatos.StrNit !== undefined) ObjActualizacion.nit = Clientes_canonicalizarIdentificacion(ObjDatos.StrNit);
  if (ObjDatos.StrTelefono !== undefined) ObjActualizacion.telefono = ObjDatos.StrTelefono?.trim() || null;
  if (ObjDatos.StrCorreo !== undefined) ObjActualizacion.correo = ObjDatos.StrCorreo?.trim() || null;
  if (ObjDatos.StrDireccion !== undefined) ObjActualizacion.direccion = ObjDatos.StrDireccion?.trim() || null;
  if (ObjDatos.StrObservaciones !== undefined) ObjActualizacion.observaciones = ObjDatos.StrObservaciones?.trim() || null;
  try { return Clientes_formatear(await ObjRepositorio.Clientes_editarRegistro(ObjDatos.IntClienteId, ObjActualizacion, ObjDatos.IntUsuarioActorId, ObjDatos.StrDireccionIp)); }
  catch (ObjError) { Clientes_lanzarErrorPersistencia(ObjError); }
}

export async function Clientes_cambiarEstado(IntClienteId: number, BoolActivo: boolean, IntUsuarioActorId: number, StrDireccionIp?: string) {
  await Clientes_obtenerPorId(IntClienteId);
  return Clientes_formatear(await ObjRepositorio.Clientes_cambiarEstadoRegistro(IntClienteId, BoolActivo, IntUsuarioActorId, StrDireccionIp));
}
