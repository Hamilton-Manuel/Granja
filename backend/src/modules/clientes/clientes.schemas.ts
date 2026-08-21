import { z } from "zod";

function Clientes_normalizarVacio(ObjValor: unknown): unknown {
  return typeof ObjValor === "string" && ObjValor.trim().length === 0 ? null : ObjValor;
}
function Clientes_crearTextoOpcional(IntMaximo: number) {
  return z.preprocess(Clientes_normalizarVacio, z.union([z.string().trim().max(IntMaximo), z.null()]).optional());
}
const ObjCorreoOpcional = z.preprocess(Clientes_normalizarVacio, z.union([z.string().trim().email().max(200), z.null()]).optional());

export const ObjParametroCliente = z.object({ clienteId: z.coerce.number().int().positive() }).strict();
export const ObjConsultaClientes = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  busqueda: z.string().trim().max(200).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  tipoClienteId: z.coerce.number().int().positive().optional(),
}).strict();

export const ObjCrearCliente = z.object({
  tipoClienteId: z.number().int().positive(),
  nombreCompleto: z.string().trim().min(1).max(200),
  numeroDocumento: Clientes_crearTextoOpcional(50),
  nit: Clientes_crearTextoOpcional(20),
  telefono: Clientes_crearTextoOpcional(30),
  correo: ObjCorreoOpcional,
  direccion: Clientes_crearTextoOpcional(500),
  observaciones: Clientes_crearTextoOpcional(1000),
}).strict();

export const ObjEditarCliente = ObjCrearCliente.partial().strict().refine(
  (ObjDatos) => Object.keys(ObjDatos).length > 0,
  { message: "Debe proporcionar al menos un campo." },
);

export const ObjCambiarEstadoCliente = z.object({ activo: z.boolean() }).strict();
