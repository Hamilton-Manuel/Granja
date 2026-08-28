import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as S from "./sanidad.service.js";
import * as Z from "./sanidad.schemas.js";
import { Fecha_parsearFechaCivil } from "../../datetime/fecha.js";
const Sanidad_idUsuario = (Req: Request) => {
  if (!Req.ObjAutenticacion) throw new Error("NO_AUTENTICADO");
  return Req.ObjAutenticacion.IntUsuarioId;
};
function Sanidad_validar<T>(ObjEsquema:z.ZodType<T>,ObjValor:unknown):T{const ObjResultado=ObjEsquema.safeParse(ObjValor);if(!ObjResultado.success)throw new ErrorAplicacion(400,"VALIDACION_INVALIDA","Los datos proporcionados no son válidos.");return ObjResultado.data;}
export async function Sanidad_listar(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const q = Sanidad_validar(Z.ObjConsultaSanidad,Req.query);
    const Obj = await S.Sanidad_listar({
      IntPagina: q.pagina,
      IntLimite: q.limite,
      StrBusqueda: q.busqueda,
      StrEstado: q.estado,
      StrDestino: q.destino,
      IntAnimalId: q.animalId,
      IntLoteId: q.loteProduccionId,
      IntTipoId: q.tipoAplicacionId,
      DtDesde: q.fechaDesde ? Fecha_parsearFechaCivil(q.fechaDesde) : undefined,
      DtHasta: q.fechaHasta ? Fecha_parsearFechaCivil(q.fechaHasta) : undefined,
    });
    Res.json({
      ok: true,
      datos: Obj.datos,
      paginacion: { pagina: q.pagina, limite: q.limite, total: Obj.total },
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_obtener(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const p = Sanidad_validar(Z.ObjParametroSanidad,Req.params);
    const d = await S.Sanidad_obtener(p.aplicacionSanitariaId);
    if (!d)
      return Res.status(404).json({
        ok: false,
        codigo: "SANIDAD_APLICACION_NO_ENCONTRADA",
        mensaje: "La aplicación sanitaria no existe.",
      });
    Res.json({ ok: true, datos: d });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_registrar(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const b = Sanidad_validar(Z.ObjRegistrarSanidad,Req.body);
    const d = await S.Sanidad_registrar({
      ...b,
      IntUsuarioId: Sanidad_idUsuario(Req),
      StrIp: Req.ip,
    });
    Res.status(201).json({ ok: true, datos: d });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_revertir(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const p = Sanidad_validar(Z.ObjParametroSanidad,Req.params),
      b = Sanidad_validar(Z.ObjRevertirSanidad,Req.body);
    Res.json({
      ok: true,
      datos: await S.Sanidad_revertir(
        p.aplicacionSanitariaId,
        b.motivo,
        Sanidad_idUsuario(Req),
        Req.ip,
      ),
    });
  } catch (e) {
    Next(e);
  }
}
export const Sanidad_catalogo =
  (StrTipo: "tipos" | "vias" | "unidades") =>
  async (Req: Request, Res: Response, Next: NextFunction) => {
    try {
      Res.json({
        ok: true,
        datos: await S.Sanidad_listarCatalogo(
          StrTipo,
          Req.query.activo === "true",
        ),
      });
    } catch (e) {
      Next(e);
    }
  };
export const Sanidad_crearCatalogo =
  (StrTipo: "tipos" | "vias" | "unidades") =>
  async (Req: Request, Res: Response, Next: NextFunction) => {
    try {
      Res.status(201).json({
        ok: true,
        datos: await S.Sanidad_crearCatalogo(
          StrTipo,
          Sanidad_validar(Z.ObjCatalogoSanidad,Req.body),
        ),
      });
    } catch (e) {
      Next(e);
    }
  };
export const Sanidad_editarCatalogo =
  (StrTipo: "tipos" | "vias" | "unidades") =>
  async (Req: Request, Res: Response, Next: NextFunction) => {
    try {
      const p = Sanidad_validar(Z.ObjParametroCatalogoSanidad,Req.params);
      Res.json({
        ok: true,
        datos: await S.Sanidad_editarCatalogo(
          StrTipo,
          p.catalogoId,
          Sanidad_validar(Z.ObjEditarCatalogoSanidad,Req.body),
        ),
      });
    } catch (e) {
      Next(e);
    }
  };
export const Sanidad_estadoCatalogo =
  (StrTipo: "tipos" | "vias" | "unidades") =>
  async (Req: Request, Res: Response, Next: NextFunction) => {
    try {
      const p = Sanidad_validar(Z.ObjParametroCatalogoSanidad,Req.params),
        b = Sanidad_validar(Z.ObjEstadoSanidad,Req.body);
      Res.json({
        ok: true,
        datos: await S.Sanidad_editarCatalogo(StrTipo, p.catalogoId, {
          activo: b.activo,
        }),
      });
    } catch (e) {
      Next(e);
    }
  };
export async function Sanidad_productos(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    Res.json({
      ok: true,
      datos: await S.Sanidad_listarProductos(Req.query.habilitados === "true"),
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_habilitar(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const p = Sanidad_validar(Z.ObjParametroProductoSanidad,Req.params),
      b = Sanidad_validar(Z.ObjEstadoSanidad,Req.body);
    Res.json({
      ok: true,
      datos: await S.Sanidad_habilitarProducto(p.productoId, b.activo),
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_animales(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const q = Sanidad_validar(Z.ObjConsultaLookupSanidad,Req.query),
      d = await S.Sanidad_destinosAnimales(q.busqueda, q.pagina, q.limite);
    Res.json({
      ok: true,
      datos: d.datos,
      paginacion: { pagina: q.pagina, limite: q.limite, total: d.total },
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_lotesProduccion(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const q = Sanidad_validar(Z.ObjConsultaLookupSanidad,Req.query),
      d = await S.Sanidad_destinosLotes(q.busqueda, q.pagina, q.limite);
    Res.json({
      ok: true,
      datos: d.datos,
      paginacion: { pagina: q.pagina, limite: q.limite, total: d.total },
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_almacenes(
  _Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    Res.json({ ok: true, datos: await S.Sanidad_almacenes() });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_existencias(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const q = Sanidad_validar(Z.ObjConsultaExistenciasSanidad,Req.query);
    Res.json({
      ok: true,
      datos: await S.Sanidad_existencias(q.productoId, q.inventarioId),
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_lotesInventario(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    const q = Sanidad_validar(Z.ObjConsultaLotesSanidad,Req.query);
    Res.json({
      ok: true,
      datos: await S.Sanidad_lotes(q.productoId, q.inventarioId, q.fechaAplicacion),
    });
  } catch (e) {
    Next(e);
  }
}
export async function Sanidad_diagnostico(
  Req: Request,
  Res: Response,
  Next: NextFunction,
) {
  try {
    Sanidad_validar(Z.ObjCuerpoVacioSanidad,Req.body??{});
    Res.json({ ok: true, datos: await S.Sanidad_diagnosticar() });
  } catch (e) {
    Next(e);
  }
}
