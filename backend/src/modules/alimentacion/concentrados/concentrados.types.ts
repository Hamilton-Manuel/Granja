import type { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client.js";
import type { ObjConcentradoRecetaCrear, ObjConcentradoRecetaEditar, ObjConcentradoPrevisualizar, ObjConcentradoConfirmar } from "./concentrados.schemas.js";

export type AlimentacionRecetaConcentradoEntrada = z.infer<typeof ObjConcentradoRecetaCrear>;
export type AlimentacionRecetaConcentradoEdicion = z.infer<typeof ObjConcentradoRecetaEditar>;
export type AlimentacionElaboracionPrevisualizacionEntrada = z.infer<typeof ObjConcentradoPrevisualizar>;
export type AlimentacionElaboracionConfirmacionEntrada = z.infer<typeof ObjConcentradoConfirmar>;
export type AlimentacionActorConcentrados = { IntUsuarioId: number; StrIp?: string };

/** Cantidad en unidad base; el costo corresponde a esa misma unidad del movimiento. */
export type AlimentacionCostoFuente = {
  IntTransaccionId: number;
  DecCantidadDescontada: Prisma.Decimal;
  DecCostoUnitarioHistorico: Prisma.Decimal;
};
export type AlimentacionValoracionElaboracion = {
  StrCostoTotal: string;
  StrCostoUnitario: string;
  StrResidualValoracion: string;
  ArrImportesFuentes: string[];
};
