import { z } from "zod";
function Proveedores_normalizarVacio(ObjValor: unknown): unknown { return typeof ObjValor === "string" && ObjValor.trim().length === 0 ? null : ObjValor; }
function Proveedores_crearTextoOpcional(IntMaximo: number) { return z.preprocess(Proveedores_normalizarVacio, z.union([z.string().trim().max(IntMaximo), z.null()]).optional()); }
const ObjCorreoOpcional = z.preprocess(Proveedores_normalizarVacio, z.union([z.string().trim().email().max(200), z.null()]).optional());
export const ObjParametroProveedor = z.object({ proveedorId: z.coerce.number().int().positive() }).strict();
export const ObjConsultaProveedores = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), busqueda: z.string().trim().max(200).optional(), estado: z.enum(["ACTIVO", "INACTIVO"]).optional(), tipoProveedorId: z.coerce.number().int().positive().optional() }).strict();
export const ObjCrearProveedor = z.object({
  tipoProveedorId: z.number().int().positive(), nombre: z.string().trim().min(1).max(200), nombreComercial: Proveedores_crearTextoOpcional(200), numeroDocumento: Proveedores_crearTextoOpcional(50), nit: Proveedores_crearTextoOpcional(20), telefono: Proveedores_crearTextoOpcional(30), correo: ObjCorreoOpcional, direccion: Proveedores_crearTextoOpcional(500), observaciones: Proveedores_crearTextoOpcional(1000),
}).strict();
export const ObjEditarProveedor = ObjCrearProveedor.partial().strict().refine((ObjDatos) => Object.keys(ObjDatos).length > 0, { message: "Debe proporcionar al menos un campo." });
export const ObjCambiarEstadoProveedor = z.object({ activo: z.boolean() }).strict();
