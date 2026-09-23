import { Prisma } from "../../../../generated/prisma/client.js";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { Fecha_obtenerAhoraGuatemala } from "../../../datetime/fecha.js";
import { Usuarios_resolverCodigos } from "../../usuarios/usuarios-accesos.js";
import { Inventario_compensarElaboracionConTx } from "../../inventario/inventario.repository.js";
import * as R from "./concentrados.reversion.repository.js";
import * as E from "./concentrados.elaboraciones.repository.js";
import * as C from "./concentrados.repository.js";
import { ObjConcentradoRevertir } from "./concentrados.schemas.js";
import { Alimentacion_operacionResuelta, Alimentacion_loteCompletoEnOrigen } from "./concentrados.reversion.js";
import { Alimentacion_esConflictoConfirmacion } from "./concentrados.confirmacion.js";
import type { AlimentacionActorConcentrados } from "./concentrados.types.js";

async function Alimentacion_exigirAccesoConTx(ObjTx: Prisma.TransactionClient, IntUsuarioId: number, StrPermiso: string) {
  const ObjUsuario = await E.Alimentacion_usuarioElaboracionConTx(ObjTx, IntUsuarioId);
  if (!ObjUsuario || ObjUsuario.estado !== "ACTIVO" || !ObjUsuario.rol.activo || !Usuarios_resolverCodigos(ObjUsuario).includes(StrPermiso)) {
    throw new ErrorAplicacion(403, "ELABORACION_NO_AUTORIZADA", "El usuario no tiene permiso para esta operación.");
  }
}
async function Alimentacion_diagnosticoReversionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  if (!await R.Alimentacion_existeElaboracionConTx(ObjTx, IntId)) throw new ErrorAplicacion(404, "ELABORACION_NO_ENCONTRADA", "La elaboración no existe.");
  const ObjElaboracion = await E.Alimentacion_obtenerElaboracionConTx(ObjTx, IntId);
  const ArrOperaciones = (await R.Alimentacion_operacionesPosterioresConTx(ObjTx, ObjElaboracion.loteInventarioId, ObjElaboracion.transaccionIngresoId))
    .map(Obj => ({ ...Obj, resuelta: Alimentacion_operacionResuelta(Obj) }));
  const ArrDependencias = ArrOperaciones.filter(Obj => !Obj.resuelta);
  const ArrUbicaciones = await R.Alimentacion_ubicacionesReversionConTx(ObjTx, ObjElaboracion.loteInventarioId);
  const ArrOriginales = await R.Alimentacion_movimientosOriginalesConTx(ObjTx, IntId);
  const ArrEsperados = [{ id: ObjElaboracion.transaccionIngresoId, fuente: ObjElaboracion.existenciaDestinoId,
    producto: ObjElaboracion.productoId, cantidad: ObjElaboracion.cantidadRealBase, costo: ObjElaboracion.costoUnitario, unidad: ObjElaboracion.unidadBaseSnapshot, subtipo: "ELABORACION_INGRESO" },
  ...ObjElaboracion.detalles.flatMap(ObjD => ObjD.fuentes.map(ObjF => ({ id: ObjF.transaccionConsumoId, fuente: ObjF.existenciaLoteId,
    producto: ObjD.productoId, cantidad: new Prisma.Decimal(ObjF.cantidadConsumida).negated().toFixed(6), costo: ObjF.costoUnitarioHistorico, unidad: ObjD.unidadBaseSnapshot, subtipo: "ELABORACION_CONSUMO" })))];
  const BoolHistoriaValida = ArrOriginales.length === ArrEsperados.length && ArrEsperados.every(Obj => {
    const ObjReal = ArrOriginales.find(ObjR => ObjR.transaccionId === Obj.id);
    return ObjReal && ObjReal.reversionId === null && ObjReal.existenciaLoteId === Obj.fuente && ObjReal.productoId === Obj.producto
      && ObjReal.unidad === Obj.unidad && ObjReal.subtipo === Obj.subtipo && ObjReal.costo !== null
      && new Prisma.Decimal(ObjReal.cantidad).eq(Obj.cantidad) && new Prisma.Decimal(ObjReal.costo).eq(Obj.costo);
  });
  const ArrBloqueos: Array<{ codigo: string; mensaje: string }> = [];
  if (ObjElaboracion.estado !== "CONFIRMADA") ArrBloqueos.push({ codigo: "ELABORACION_YA_REVERTIDA", mensaje: "La elaboración ya fue revertida." });
  else {
    if (!BoolHistoriaValida) ArrBloqueos.push({ codigo: "ELABORACION_HISTORIA_INCONSISTENTE", mensaje: "Los movimientos originales no coinciden con los snapshots o ya fueron compensados." });
    if (ArrDependencias.length) ArrBloqueos.push({ codigo: "ELABORACION_DEPENDENCIAS_PENDIENTES", mensaje: "Revierta explícitamente las operaciones dependientes antes de continuar." });
    if (!Alimentacion_loteCompletoEnOrigen(ArrUbicaciones, ObjElaboracion.existenciaDestinoId, ObjElaboracion.cantidadRealBase)) {
      ArrBloqueos.push({ codigo: "ELABORACION_LOTE_NO_DISPONIBLE", mensaje: "El lote completo debe estar en su ubicación original, sin saldo en otros almacenes." });
    }
  }
  return { ObjElaboracion, ArrOriginales, ObjDiagnostico: { elaboracionId: IntId, estado: ObjElaboracion.estado,
    loteInventarioId: ObjElaboracion.loteInventarioId, existenciaDestinoId: ObjElaboracion.existenciaDestinoId, cantidadRequerida: ObjElaboracion.cantidadRealBase,
    unidad: ObjElaboracion.unidadBaseSnapshot, reversible: ArrBloqueos.length === 0, bloqueos: ArrBloqueos,
    operaciones: ArrOperaciones, dependencias: ArrDependencias, ubicaciones: ArrUbicaciones } };
}
export class AlimentacionReversionBloqueada extends ErrorAplicacion {
  constructor(public readonly ObjDiagnostico: Awaited<ReturnType<typeof Alimentacion_diagnosticoReversionConTx>>["ObjDiagnostico"]) {
    super(409, "ELABORACION_REVERSION_BLOQUEADA", "La elaboración tiene dependencias pendientes o no conserva su lote completo. Consulte los bloqueos.");
  }
}
function Alimentacion_errorReversion(ObjError: unknown): never {
  if (ObjError instanceof ErrorAplicacion) throw ObjError;
  if (Alimentacion_esConflictoConfirmacion(ObjError) || (ObjError instanceof Error && ObjError.message === "ELABORACION_REVERSION_CONFLICTO")) {
    throw new ErrorAplicacion(409, "ELABORACION_CONFLICTO_CONCURRENCIA", "La operación encontró un conflicto de concurrencia y no pudo completarse. Consulte el estado y reintente.");
  }
  throw ObjError;
}
export async function Alimentacion_consultarDependencias(IntId: number, ObjActor: AlimentacionActorConcentrados) {
  try {
    return await C.Alimentacion_ejecutarConcentradosTx(async ObjTx => {
      await Alimentacion_exigirAccesoConTx(ObjTx, ObjActor.IntUsuarioId, "ALIMENTACION_ELABORACIONES_CONSULTAR");
      return (await Alimentacion_diagnosticoReversionConTx(ObjTx, IntId)).ObjDiagnostico;
    });
  } catch (ObjError) { Alimentacion_errorReversion(ObjError); }
}
export async function Alimentacion_revertirElaboracion(IntId: number, ObjDatos: unknown, ObjActor: AlimentacionActorConcentrados) {
  const ObjEntrada = ObjConcentradoRevertir.safeParse(ObjDatos);
  if (!ObjEntrada.success) throw new ErrorAplicacion(400, "ELABORACION_MOTIVO_INVALIDO", "Indique un motivo de reversión de entre 1 y 500 caracteres.");
  try {
    return await C.Alimentacion_ejecutarConcentradosTx(async ObjTx => {
      await Alimentacion_exigirAccesoConTx(ObjTx, ObjActor.IntUsuarioId, "ALIMENTACION_ELABORACIONES_REVERTIR");
      if (!await R.Alimentacion_bloquearReversionConTx(ObjTx, IntId)) throw new ErrorAplicacion(404, "ELABORACION_NO_ENCONTRADA", "La elaboración no existe.");
      const ObjActual = await E.Alimentacion_obtenerElaboracionConTx(ObjTx, IntId);
      if (ObjActual.estado === "REVERTIDA") {
        const ArrOriginales = await R.Alimentacion_movimientosOriginalesConTx(ObjTx, IntId);
        return { datos: ObjActual, reutilizada: true, movimientosReversion: ArrOriginales.map(Obj => Obj.reversionId) };
      }
      const { ObjElaboracion, ArrOriginales, ObjDiagnostico } = await Alimentacion_diagnosticoReversionConTx(ObjTx, IntId);
      if (!ObjDiagnostico.reversible) throw new AlimentacionReversionBloqueada(ObjDiagnostico);
      const DtAhora = Fecha_obtenerAhoraGuatemala();
      // Retirar primero el terminado; después restituir fuentes en el orden estable del repositorio.
      const ArrOrdenadas = [ArrOriginales.find(Obj => Obj.transaccionId === ObjElaboracion.transaccionIngresoId)!,
        ...ArrOriginales.filter(Obj => Obj.transaccionId !== ObjElaboracion.transaccionIngresoId)];
      for (const ObjOriginal of ArrOrdenadas) {
        await Inventario_compensarElaboracionConTx(ObjTx, IntId, ObjOriginal.transaccionId, ObjActor.IntUsuarioId, ObjEntrada.data.motivo, DtAhora);
      }
      await R.Alimentacion_marcarRevertidaConTx(ObjTx, IntId, ObjElaboracion.loteInventarioId, ObjActor.IntUsuarioId, ObjEntrada.data.motivo, DtAhora);
      await C.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "ELABORACION_REVERTIDA", `Elaboración ${IntId}; ${ObjEntrada.data.motivo}`, ObjActor.StrIp);
      const ArrRevertidas = await R.Alimentacion_movimientosOriginalesConTx(ObjTx, IntId);
      return { datos: await E.Alimentacion_obtenerElaboracionConTx(ObjTx, IntId), reutilizada: false, movimientosReversion: ArrRevertidas.map(Obj => Obj.reversionId) };
    });
  } catch (ObjError) { Alimentacion_errorReversion(ObjError); }
}
