import type { Prisma } from "../../../generated/prisma/client.js";

import { BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_obtenerAhoraGuatemala } from "../../datetime/fecha.js";

const ObjSeleccionCliente = {
  clienteId: true, tipoClienteId: true, codigo: true, nombreCompleto: true,
  numeroDocumento: true, nit: true, telefono: true, correo: true, direccion: true,
  observaciones: true, activo: true, fechaCreacion: true, fechaActualizacion: true,
  tipo: { select: { tipoClienteId: true, codigo: true, nombre: true, activo: true } },
} satisfies Prisma.ClienteRegistroSelect;

export function Clientes_listarRegistros(ObjConsulta: {
  IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined;
  BoolActivo?: boolean | undefined; IntTipoClienteId?: number | undefined;
}) {
  const ObjWhere: Prisma.ClienteRegistroWhereInput = {
    ...(ObjConsulta.BoolActivo === undefined ? {} : { activo: ObjConsulta.BoolActivo }),
    ...(ObjConsulta.IntTipoClienteId === undefined ? {} : { tipoClienteId: ObjConsulta.IntTipoClienteId }),
    ...(ObjConsulta.StrBusqueda === undefined || ObjConsulta.StrBusqueda.length === 0 ? {} : { OR: [
      { codigo: { contains: ObjConsulta.StrBusqueda } }, { nombreCompleto: { contains: ObjConsulta.StrBusqueda } },
      { nit: { contains: ObjConsulta.StrBusqueda } }, { numeroDocumento: { contains: ObjConsulta.StrBusqueda } },
      { correo: { contains: ObjConsulta.StrBusqueda } },
    ] }),
  };
  const ObjPrisma = BaseDatos_obtenerCliente();
  return ObjPrisma.$transaction(async (ObjTx) => ({
    ArrClientes: await ObjTx.clienteRegistro.findMany({ where: ObjWhere, select: ObjSeleccionCliente, orderBy: { clienteId: "asc" }, skip: (ObjConsulta.IntPagina - 1) * ObjConsulta.IntLimite, take: ObjConsulta.IntLimite }),
    IntTotal: await ObjTx.clienteRegistro.count({ where: ObjWhere }),
  }));
}

export function Clientes_obtenerRegistro(IntClienteId: number) {
  return BaseDatos_obtenerCliente().clienteRegistro.findUnique({ where: { clienteId: IntClienteId }, select: ObjSeleccionCliente });
}

export function Clientes_obtenerTipo(IntTipoClienteId: number) {
  return BaseDatos_obtenerCliente().clienteTipo.findUnique({ where: { tipoClienteId: IntTipoClienteId } });
}

export function Clientes_listarTipos() {
  return BaseDatos_obtenerCliente().clienteTipo.findMany({ select: { tipoClienteId: true, codigo: true, nombre: true, descripcion: true, activo: true }, orderBy: { tipoClienteId: "asc" } });
}

async function Clientes_registrarBitacora(ObjTx: Prisma.TransactionClient, IntActorId: number, StrAccion: string, IntClienteId: number, StrCodigo: string, StrDireccionIp?: string): Promise<void> {
  await ObjTx.usuarioBitacora.create({ data: { usuarioId: IntActorId, modulo: "CLIENTES", accion: StrAccion, descripcion: `Cliente ${IntClienteId}; codigo ${StrCodigo}.`, resultado: "EXITO", direccionIp: StrDireccionIp ?? null } });
}

export function Clientes_crearRegistro(ObjDatos: Prisma.ClienteRegistroUncheckedCreateInput & { IntUsuarioActorId: number; StrDireccionIp?: string | undefined }) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const ObjCliente = await ObjTx.clienteRegistro.create({ data: { tipoClienteId: ObjDatos.tipoClienteId, nombreCompleto: ObjDatos.nombreCompleto, numeroDocumento: ObjDatos.numeroDocumento ?? null, nit: ObjDatos.nit ?? null, telefono: ObjDatos.telefono ?? null, correo: ObjDatos.correo ?? null, direccion: ObjDatos.direccion ?? null, observaciones: ObjDatos.observaciones ?? null }, select: ObjSeleccionCliente });
    await Clientes_registrarBitacora(ObjTx, ObjDatos.IntUsuarioActorId, "CLIENTE_CREADO", ObjCliente.clienteId, ObjCliente.codigo, ObjDatos.StrDireccionIp);
    return ObjCliente;
  });
}

export function Clientes_editarRegistro(IntClienteId: number, ObjActualizacion: Prisma.ClienteRegistroUncheckedUpdateInput, IntUsuarioActorId: number, StrDireccionIp?: string) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const ObjCliente = await ObjTx.clienteRegistro.update({ where: { clienteId: IntClienteId }, data: { ...ObjActualizacion, fechaActualizacion: Fecha_obtenerAhoraGuatemala() }, select: ObjSeleccionCliente });
    await Clientes_registrarBitacora(ObjTx, IntUsuarioActorId, "CLIENTE_EDITADO", ObjCliente.clienteId, ObjCliente.codigo, StrDireccionIp);
    return ObjCliente;
  });
}

export function Clientes_cambiarEstadoRegistro(IntClienteId: number, BoolActivo: boolean, IntUsuarioActorId: number, StrDireccionIp?: string) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const ObjCliente = await ObjTx.clienteRegistro.update({ where: { clienteId: IntClienteId }, data: { activo: BoolActivo, fechaActualizacion: Fecha_obtenerAhoraGuatemala() }, select: ObjSeleccionCliente });
    await Clientes_registrarBitacora(ObjTx, IntUsuarioActorId, "CLIENTE_ESTADO_CAMBIADO", ObjCliente.clienteId, ObjCliente.codigo, StrDireccionIp);
    return ObjCliente;
  });
}
