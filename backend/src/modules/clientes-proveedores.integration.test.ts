import assert from "node:assert/strict";
import test from "node:test";

import { BaseDatos_desconectar, BaseDatos_exigirBaseActual, BaseDatos_obtenerCliente } from "../database/prisma.js";
import { ErrorAplicacion } from "../errors/error-aplicacion.js";
import * as ObjClientes from "./clientes/clientes.service.js";
import * as ObjProveedores from "./proveedores/proveedores.service.js";

const StrBaseIntegracion = "granja_clientes_proveedores_migracion_pruebas";
const BoolEjecutarIntegracion = process.env.BASE_DATOS_ESPERADA === StrBaseIntegracion;

test("integracion temporal Clientes y Proveedores", { skip: !BoolEjecutarIntegracion }, async () => {
  await BaseDatos_exigirBaseActual(StrBaseIntegracion);
  const ObjPrisma = BaseDatos_obtenerCliente();
  const ObjWebmaster = await ObjPrisma.usuarioCuenta.findUnique({ where: { nombreUsuario: "webmaster_fase3" } });
  assert.notEqual(ObjWebmaster, null);
  const ObjTipoCliente = await ObjPrisma.clienteTipo.findUnique({ where: { codigo: "PERSONA_INDIVIDUAL" } });
  const ObjTipoProveedor = await ObjPrisma.proveedorTipo.findUnique({ where: { codigo: "PERSONA_INDIVIDUAL" } });
  assert.notEqual(ObjTipoCliente, null);
  assert.notEqual(ObjTipoProveedor, null);
  if (ObjWebmaster === null || ObjTipoCliente === null || ObjTipoProveedor === null) return;

  const ArrPermisosPorRol = await ObjPrisma.usuarioRol.findMany({
    where: { nombre: { in: ["WEBMASTER", "ADMINISTRADOR", "OPERADOR"] } },
    select: { nombre: true, _count: { select: { rolesPermisos: true } } },
  });
  const ObjConteos = Object.fromEntries(ArrPermisosPorRol.map((ObjRol) => [ObjRol.nombre, ObjRol._count.rolesPermisos]));
  assert.equal(ObjConteos.WEBMASTER, 15);
  assert.equal(ObjConteos.ADMINISTRADOR, 15);
  assert.equal(ObjConteos.OPERADOR, 0);

  const StrSufijo = String(Date.now());
  const StrNitCompartido = `NIT${StrSufijo}`;
  const ObjCliente = await ObjClientes.Clientes_crear({ IntTipoClienteId: ObjTipoCliente.tipoClienteId, StrNombreCompleto: `Cliente temporal ${StrSufijo}`, StrNit: ` ${StrNitCompartido.slice(0, 6)}-${StrNitCompartido.slice(6)} `, StrNumeroDocumento: `DOC-C-${StrSufijo}`, IntUsuarioActorId: ObjWebmaster.usuarioId });
  assert.match(ObjCliente.codigo, /^CLI\d{6}$/);
  assert.equal(ObjCliente.nit, StrNitCompartido);

  const ObjProveedor = await ObjProveedores.Proveedores_crear({ IntTipoProveedorId: ObjTipoProveedor.tipoProveedorId, StrNombre: `Proveedor temporal ${StrSufijo}`, StrNit: StrNitCompartido, StrNumeroDocumento: `DOC-P-${StrSufijo}`, IntUsuarioActorId: ObjWebmaster.usuarioId });
  assert.match(ObjProveedor.codigo, /^PRO\d{6}$/);
  assert.equal(ObjProveedor.nit, StrNitCompartido);

  const ObjClienteCf1 = await ObjClientes.Clientes_crear({ IntTipoClienteId: ObjTipoCliente.tipoClienteId, StrNombreCompleto: `CF uno ${StrSufijo}`, StrNit: "CF", IntUsuarioActorId: ObjWebmaster.usuarioId });
  const ObjClienteCf2 = await ObjClientes.Clientes_crear({ IntTipoClienteId: ObjTipoCliente.tipoClienteId, StrNombreCompleto: `CF dos ${StrSufijo}`, StrNit: "cf", IntUsuarioActorId: ObjWebmaster.usuarioId });
  assert.equal(ObjClienteCf1.nit, "CF");
  assert.equal(ObjClienteCf2.nit, "CF");

  await assert.rejects(
    ObjClientes.Clientes_crear({ IntTipoClienteId: ObjTipoCliente.tipoClienteId, StrNombreCompleto: `Duplicado ${StrSufijo}`, StrNit: StrNitCompartido, IntUsuarioActorId: ObjWebmaster.usuarioId }),
    (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "NIT_DUPLICADO",
  );
  await assert.rejects(
    ObjClientes.Clientes_crear({ IntTipoClienteId: ObjTipoCliente.tipoClienteId, StrNombreCompleto: `Documento duplicado ${StrSufijo}`, StrNumeroDocumento: `DOC-C-${StrSufijo}`, IntUsuarioActorId: ObjWebmaster.usuarioId }),
    (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "DOCUMENTO_DUPLICADO",
  );
  await assert.rejects(
    ObjProveedores.Proveedores_crear({ IntTipoProveedorId: ObjTipoProveedor.tipoProveedorId, StrNombre: `NIT duplicado ${StrSufijo}`, StrNit: StrNitCompartido, IntUsuarioActorId: ObjWebmaster.usuarioId }),
    (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "NIT_DUPLICADO",
  );
  await assert.rejects(
    ObjProveedores.Proveedores_crear({ IntTipoProveedorId: ObjTipoProveedor.tipoProveedorId, StrNombre: `CF invalido ${StrSufijo}`, StrNit: "CF", IntUsuarioActorId: ObjWebmaster.usuarioId }),
    (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "VALIDACION_INVALIDA",
  );

  const ObjEditado = await ObjClientes.Clientes_editar({ IntClienteId: ObjCliente.clienteId, StrTelefono: "55550000", IntUsuarioActorId: ObjWebmaster.usuarioId });
  assert.equal(ObjEditado.telefono, "55550000");
  const ObjInactivo = await ObjProveedores.Proveedores_cambiarEstado(ObjProveedor.proveedorId, false, ObjWebmaster.usuarioId);
  assert.equal(ObjInactivo.activo, false);

  const ObjListadoCliente = await ObjClientes.Clientes_listar({ IntPagina: 1, IntLimite: 20, StrBusqueda: ObjCliente.codigo, StrEstado: "ACTIVO", IntTipoClienteId: ObjTipoCliente.tipoClienteId });
  assert.equal(ObjListadoCliente.ArrClientes.some((ObjRegistro) => ObjRegistro.clienteId === ObjCliente.clienteId), true);
  const ObjListadoProveedor = await ObjProveedores.Proveedores_listar({ IntPagina: 1, IntLimite: 20, StrBusqueda: ObjProveedor.codigo, StrEstado: "INACTIVO", IntTipoProveedorId: ObjTipoProveedor.tipoProveedorId });
  assert.equal(ObjListadoProveedor.ArrProveedores.some((ObjRegistro) => ObjRegistro.proveedorId === ObjProveedor.proveedorId), true);

  await assert.rejects(
    ObjClientes.Clientes_crear({ IntTipoClienteId: 2_147_483_647, StrNombreCompleto: "Tipo inexistente", IntUsuarioActorId: ObjWebmaster.usuarioId }),
    (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "TIPO_CLIENTE_NO_ENCONTRADO",
  );
  await ObjPrisma.proveedorTipo.update({ where: { tipoProveedorId: ObjTipoProveedor.tipoProveedorId }, data: { activo: false } });
  try {
    await assert.rejects(
      ObjProveedores.Proveedores_crear({ IntTipoProveedorId: ObjTipoProveedor.tipoProveedorId, StrNombre: "Tipo inactivo", IntUsuarioActorId: ObjWebmaster.usuarioId }),
      (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "TIPO_PROVEEDOR_INACTIVO",
    );
  } finally {
    await ObjPrisma.proveedorTipo.update({ where: { tipoProveedorId: ObjTipoProveedor.tipoProveedorId }, data: { activo: true } });
  }

  const IntBitacoras = await ObjPrisma.usuarioBitacora.count({ where: { OR: [{ modulo: "CLIENTES", descripcion: { contains: ObjCliente.codigo } }, { modulo: "PROVEEDORES", descripcion: { contains: ObjProveedor.codigo } }] } });
  assert.equal(IntBitacoras >= 4, true);
});

test.after(async () => {
  await BaseDatos_desconectar();
});
