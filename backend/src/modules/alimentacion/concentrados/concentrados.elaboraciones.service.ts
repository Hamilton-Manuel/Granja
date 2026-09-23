import { Prisma } from "../../../../generated/prisma/client.js";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { Fecha_parsearFechaHoraGuatemala, Fecha_convertirInstanteAAlmacenamientoGuatemala, Fecha_parsearFechaCivil, Fecha_obtenerAhoraGuatemala } from "../../../datetime/fecha.js";
import { Usuarios_resolverCodigos } from "../../usuarios/usuarios-accesos.js";
import { Inventario_aplicarMovimientoConTx, Inventario_registrarEntradaConLoteConTx } from "../../inventario/inventario.repository.js";
import { Inventario_convertirCantidadSinCuantizar } from "../../inventario/inventario.precision.js";
import * as R from "./concentrados.elaboraciones.repository.js";
import * as C from "./concentrados.repository.js";
import { Alimentacion_previsualizarConTx } from "./concentrados.service.js";
import { Alimentacion_calcularValoracionElaboracion } from "./concentrados.calculos.js";
import { Alimentacion_prepararConfirmacion, Alimentacion_exigirIdempotencia, Alimentacion_exigirPreviaVigente, Alimentacion_esConflictoConfirmacion } from "./concentrados.confirmacion.js";
import type { AlimentacionActorConcentrados } from "./concentrados.types.js";

export async function Alimentacion_confirmarElaboracion(ObjDatos: unknown, ObjActor: AlimentacionActorConcentrados) {
  const { ObjEntrada, StrClave, StrHash, StrHuella } = Alimentacion_prepararConfirmacion(ObjDatos, ObjActor.IntUsuarioId);
  try {
    return await C.Alimentacion_ejecutarConcentradosTx(async ObjTx => {
      const ObjUsuario = await R.Alimentacion_usuarioElaboracionConTx(ObjTx, ObjActor.IntUsuarioId);
      if (!ObjUsuario || ObjUsuario.estado !== "ACTIVO" || !ObjUsuario.rol.activo || !Usuarios_resolverCodigos(ObjUsuario).includes("ALIMENTACION_ELABORACIONES_REGISTRAR")) {
        throw new ErrorAplicacion(403, "ELABORACION_NO_AUTORIZADA", "El usuario no está autorizado para registrar elaboraciones.");
      }
      const ObjAnterior = await R.Alimentacion_idempotenciaConTx(ObjTx, StrClave);
      if (ObjAnterior) {
        Alimentacion_exigirIdempotencia(ObjAnterior, ObjActor.IntUsuarioId, StrHash);
        return { datos: await R.Alimentacion_obtenerElaboracionConTx(ObjTx, ObjAnterior.elaboracionId), reutilizada: true };
      }
      const { ObjPrevia, ObjContexto } = await Alimentacion_previsualizarConTx(ObjTx, ObjEntrada).catch(ObjError => {
        if (ObjError instanceof ErrorAplicacion && [404, 409, 422].includes(ObjError.IntEstadoHttp)) {
          throw new ErrorAplicacion(409, "ELABORACION_PREVIA_OBSOLETA", "Los datos ya no son válidos. Genere una nueva vista previa.");
        }
        throw ObjError;
      });
      Alimentacion_exigirPreviaVigente(ObjPrevia.disponible, ObjPrevia.huellaPrevisualizacion, StrHuella);
      const ArrConsumos = [];
      // Mismo orden estable de la receta/productos y de las fuentes que la vista previa.
      for (const ObjIngrediente of ObjPrevia.ingredientes) {
        for (const ObjFuente of ObjIngrediente.fuentes) {
          const ObjMovimiento = await Inventario_aplicarMovimientoConTx(ObjTx, { tipo: "SALIDA", subtipo: "ELABORACION_CONSUMO",
            productoId: ObjIngrediente.productoId, inventarioId: ObjFuente.inventarioId, loteInventarioId: ObjFuente.loteInventarioId,
            cantidad: new Prisma.Decimal(ObjFuente.cantidad).negated(), documentoReferencia: StrClave, ...ObjActor });
          const ObjCosto = await C.Alimentacion_leerCostoConsumoConTx(ObjTx, ObjMovimiento.transaccionInventarioId, ObjFuente.existenciaLoteId, ObjIngrediente.unidadBase);
          if (!ObjCosto.DecCantidadDescontada.eq(ObjFuente.cantidad) || !ObjCosto.DecCostoUnitarioHistorico.eq(ObjFuente.costoUnitario)) {
            throw new ErrorAplicacion(409, "ELABORACION_CONSUMO_INCONSISTENTE", "El consumo no coincide con la vista previa. Genere una nueva vista previa.");
          }
          ArrConsumos.push({ productoId: ObjIngrediente.productoId, existenciaLoteId: ObjFuente.existenciaLoteId, ObjCosto });
        }
      }
      const ObjValoracion = Alimentacion_calcularValoracionElaboracion(ArrConsumos.map(Obj => Obj.ObjCosto), new Prisma.Decimal(ObjPrevia.cantidadRealBase));
      if (ObjValoracion.StrCostoTotal !== ObjPrevia.costoEstimado!.total || ObjValoracion.StrCostoUnitario !== ObjPrevia.costoEstimado!.unitario || ObjValoracion.StrResidualValoracion !== ObjPrevia.costoEstimado!.residualValoracion) {
        throw new ErrorAplicacion(409, "ELABORACION_COSTO_INCONSISTENTE", "El costo consumido no concilia con la vista previa. Genere una nueva vista previa.");
      }
      const ObjIngreso = await Inventario_registrarEntradaConLoteConTx(ObjTx, { subtipo: "ELABORACION_INGRESO",
        productoId: ObjContexto.producto.productoId, inventarioId: ObjEntrada.inventarioDestinoId,
        cantidadComercial: new Prisma.Decimal(ObjEntrada.cantidadReal), unidadComercial: ObjEntrada.unidadCaptura,
        cantidadBase: new Prisma.Decimal(ObjPrevia.cantidadRealBase), unidadBase: ObjContexto.producto.unidadBase,
        factorConversion: Inventario_convertirCantidadSinCuantizar(new Prisma.Decimal(1), new Prisma.Decimal(ObjContexto.factorCaptura), new Prisma.Decimal(ObjContexto.producto.factor)),
        costoUnitario: new Prisma.Decimal(ObjValoracion.StrCostoUnitario), precioTotalIngreso: null,
        fechaFabricacion: Fecha_parsearFechaCivil(ObjEntrada.fechaEfectiva.slice(0, 10)),
        fechaVencimiento: ObjEntrada.fechaVencimiento ? Fecha_parsearFechaCivil(ObjEntrada.fechaVencimiento) : null,
        documentoReferencia: StrClave, observaciones: ObjEntrada.observaciones ?? null, ...ObjActor });
      const DtFecha = Fecha_convertirInstanteAAlmacenamientoGuatemala(Fecha_parsearFechaHoraGuatemala(ObjEntrada.fechaEfectiva));
      await R.Alimentacion_fechaMovimientosConTx(ObjTx, [...ArrConsumos.map(Obj => Obj.ObjCosto.IntTransaccionId), ObjIngreso.transaccionInventarioId], DtFecha, ObjIngreso.lote.loteInventarioId);
      const IntId = await R.Alimentacion_guardarElaboracionConTx(ObjTx, {
        recetaId: ObjContexto.receta.recetaId, productoId: ObjContexto.producto.productoId, versionReceta: ObjContexto.receta.version,
        nombreRecetaSnapshot: ObjContexto.receta.nombre, codigoProductoSnapshot: ObjContexto.producto.codigo, nombreProductoSnapshot: ObjContexto.producto.nombre,
        cantidadBaseReceta: ObjContexto.receta.cantidadBase, unidadRecetaSnapshot: ObjContexto.receta.unidadBase, factorReferenciaReceta: ObjContexto.receta.factor,
        cantidadTeorica: ObjEntrada.cantidadTeorica, cantidadReal: ObjEntrada.cantidadReal, unidadCaptura: ObjEntrada.unidadCaptura, factorReferenciaCaptura: ObjContexto.factorCaptura,
        cantidadTeoricaBase: ObjPrevia.cantidadTeoricaBase, cantidadRealBase: ObjPrevia.cantidadRealBase, unidadBaseSnapshot: ObjContexto.producto.unidadBase, factorReferenciaBase: ObjContexto.producto.factor,
        costoTotal: ObjValoracion.StrCostoTotal, costoUnitario: ObjValoracion.StrCostoUnitario, residualValoracion: ObjValoracion.StrResidualValoracion,
        motivoDiferencia: ObjEntrada.motivoDiferencia ?? null, observaciones: ObjEntrada.observaciones ?? null,
        fechaEfectiva: DtFecha, fechaCreacion: Fecha_obtenerAhoraGuatemala(), usuarioId: ObjActor.IntUsuarioId,
        claveIdempotencia: StrClave, hashSolicitud: StrHash, huellaPrevisualizacion: StrHuella,
        loteInventarioId: ObjIngreso.lote.loteInventarioId, existenciaDestinoId: ObjIngreso.existenciaLoteId!, transaccionIngresoId: ObjIngreso.transaccionInventarioId,
      });
      for (const ObjIngrediente of ObjContexto.ingredientes) {
        const ObjPlan = ObjPrevia.ingredientes.find(Obj => Obj.productoId === ObjIngrediente.productoId)!;
        const IntDetalle = await R.Alimentacion_guardarDetalleElaboracionConTx(ObjTx, { elaboracionId: IntId, productoId: ObjIngrediente.productoId,
          codigoProductoSnapshot: ObjIngrediente.codigo, nombreProductoSnapshot: ObjIngrediente.nombre, cantidadReceta: ObjIngrediente.cantidadReceta,
          unidadRecetaSnapshot: ObjIngrediente.unidadReceta, factorReferenciaReceta: ObjIngrediente.factorReceta,
          unidadBaseSnapshot: ObjIngrediente.unidadBase, factorReferenciaBase: ObjIngrediente.factorBase, cantidadConsumida: ObjPlan.cantidadRequerida });
        for (const [IntIndice, ObjConsumo] of ArrConsumos.entries()) {
          if (ObjConsumo.productoId !== ObjIngrediente.productoId) continue;
          await R.Alimentacion_guardarFuenteElaboracionConTx(ObjTx, { elaboracionDetalleId: IntDetalle, productoId: ObjConsumo.productoId,
            existenciaLoteId: ObjConsumo.existenciaLoteId, transaccionConsumoId: ObjConsumo.ObjCosto.IntTransaccionId,
            cantidadConsumida: ObjConsumo.ObjCosto.DecCantidadDescontada.toFixed(6), costoUnitarioHistorico: ObjConsumo.ObjCosto.DecCostoUnitarioHistorico.toFixed(18), costoTotal: ObjValoracion.ArrImportesFuentes[IntIndice]! });
        }
      }
      await C.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "ELABORACION_CONFIRMADA", `Elaboración ${IntId}; lote ${ObjIngreso.lote.codigoLote}.`, ObjActor.StrIp);
      return { datos: await R.Alimentacion_obtenerElaboracionConTx(ObjTx, IntId), reutilizada: false };
    });
  } catch (ObjError) {
    if (ObjError instanceof ErrorAplicacion) throw ObjError;
    if (Alimentacion_esConflictoConfirmacion(ObjError)) {
      throw new ErrorAplicacion(409, "ELABORACION_CONFLICTO", "La operación encontró un conflicto de integridad o concurrencia. Consulte el resultado y reintente con la misma clave.");
    }
    if (ObjError instanceof Error && ["STOCK_INSUFICIENTE", "FUENTE_INVENTARIO_INCONSISTENTE"].includes(ObjError.message)) {
      throw new ErrorAplicacion(409, "ELABORACION_PREVIA_OBSOLETA", "El inventario cambió. Genere una nueva vista previa.");
    }
    throw ObjError;
  }
}
