import { z } from "zod";

const ObjContrasena = z.string().min(8).max(128);

export const ObjLoginUsuario = z.object({
  identificador: z.string().trim().min(1).max(200),
  contrasena: z.string().min(1).max(128),
});

export const ObjCrearUsuario = z.object({
  rolId: z.number().int().positive(),
  nombreCompleto: z.string().trim().min(1).max(200),
  nombreUsuario: z.string().trim().min(1).max(100),
  correo: z.string().trim().email().max(200),
  contrasena: ObjContrasena,
});

export const ObjEditarUsuario = z
  .object({
    nombreCompleto: z.string().trim().min(1).max(200).optional(),
    nombreUsuario: z.string().trim().min(1).max(100).optional(),
    correo: z.string().trim().email().max(200).optional(),
  })
  .refine((ObjDatos) => Object.keys(ObjDatos).length > 0);

export const ObjCambiarEstadoUsuario = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

export const ObjCambiarRolUsuario = z.object({
  rolId: z.number().int().positive(),
});

export const ObjCambiarContrasena = z.object({
  contrasenaActual: z.string().min(1).max(128),
  contrasenaNueva: ObjContrasena,
});

export const ObjParametroUsuario = z.object({
  usuarioId: z.coerce.number().int().positive(),
});

export const ObjConsultaUsuarios = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  busqueda: z.string().trim().max(200).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  rolId: z.coerce.number().int().positive().optional(),
});
