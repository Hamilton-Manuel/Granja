import { Router } from "express";
import {
  Middleware_requerirAutenticacion,
  Middleware_requerirPermiso,
} from "../../middleware/autenticacion.middleware.js";
import * as C from "./sanidad.controller.js";
import { Sanidad_formatearRespuesta } from "./sanidad.service.js";
export function Sanidad_crearRouter() {
  const R = Router();
  R.use(Middleware_requerirAutenticacion);
  R.use((_q, s, n) => {
    const j = s.json.bind(s);
    s.json = ((d: unknown) =>
      j(Sanidad_formatearRespuesta(d))) as typeof s.json;
    n();
  });
  R.get(
    "/destinos/animales",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_animales,
  );
  R.get(
    "/destinos/lotes",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_lotesProduccion,
  );
  R.get(
    "/almacenes",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_almacenes,
  );
  R.get(
    "/existencias",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_existencias,
  );
  R.get(
    "/lotes-inventario",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_lotesInventario,
  );
  R.get(
    "/productos",
    Middleware_requerirPermiso("SANIDAD_CONSULTAR"),
    C.Sanidad_productos,
  );
  R.patch(
    "/productos/:productoId/habilitacion",
    Middleware_requerirPermiso("SANIDAD_PRODUCTOS_GESTIONAR"),
    C.Sanidad_habilitar,
  );
  for (const [StrRuta, StrTipo, StrPrefijo] of [
    ["tipos-aplicacion", "tipos", "SANIDAD_TIPOS"],
    ["vias-administracion", "vias", "SANIDAD_VIAS"],
    ["unidades-dosis", "unidades", "SANIDAD_UNIDADES"],
  ] as const) {
    R.get(
      `/catalogos/${StrRuta}`,
      Middleware_requerirPermiso("SANIDAD_CONSULTAR"),
      C.Sanidad_catalogo(StrTipo),
    );
    R.post(
      `/catalogos/${StrRuta}`,
      Middleware_requerirPermiso(`${StrPrefijo}_CREAR`),
      C.Sanidad_crearCatalogo(StrTipo),
    );
    R.patch(
      `/catalogos/${StrRuta}/:catalogoId`,
      Middleware_requerirPermiso(`${StrPrefijo}_EDITAR`),
      C.Sanidad_editarCatalogo(StrTipo),
    );
    R.patch(
      `/catalogos/${StrRuta}/:catalogoId/estado`,
      Middleware_requerirPermiso(`${StrPrefijo}_CAMBIAR_ESTADO`),
      C.Sanidad_estadoCatalogo(StrTipo),
    );
  }
  R.post(
    "/diagnosticos/reconciliacion",
    Middleware_requerirPermiso("SANIDAD_RECONCILIACION_EJECUTAR"),
    C.Sanidad_diagnostico,
  );
  R.get("/", Middleware_requerirPermiso("SANIDAD_CONSULTAR"), C.Sanidad_listar);
  R.post(
    "/",
    Middleware_requerirPermiso("SANIDAD_REGISTRAR"),
    C.Sanidad_registrar,
  );
  R.get(
    "/:aplicacionSanitariaId",
    Middleware_requerirPermiso("SANIDAD_CONSULTAR"),
    C.Sanidad_obtener,
  );
  R.post(
    "/:aplicacionSanitariaId/revertir",
    Middleware_requerirPermiso("SANIDAD_REVERTIR"),
    C.Sanidad_revertir,
  );
  return R;
}
