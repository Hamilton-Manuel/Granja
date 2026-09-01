import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as R from "./produccion-ficha.repository.js";

type Aplicacion = R.DatosFichaTecnica["ObjAnimal"]["sanidadAplicaciones"][number];

function Produccion_detallesSanitarios(ObjAplicacion: Aplicacion, BoolGlobal: boolean) {
  return ObjAplicacion.detalles.map((ObjDetalle) => ({
    producto: ObjDetalle.producto.nombre,
    via: ObjDetalle.viaAdministracion.nombre,
    ...(BoolGlobal
      ? ObjDetalle.alcanceDosis === "POR_ANIMAL"
        ? { dosisIndicadaPorAnimal: ObjDetalle.dosisClinica, unidadClinica: ObjDetalle.unidadDosis.nombre }
        : {}
      : { dosisClinica: ObjDetalle.dosisClinica, unidadClinica: ObjDetalle.unidadDosis.nombre }),
  }));
}

function Produccion_aplicacionSanitaria(ObjAplicacion: Aplicacion, BoolGlobal: boolean) {
  return {
    aplicacionSanitariaId: ObjAplicacion.aplicacionSanitariaId,
    alcance: BoolGlobal ? "LOTE" as const : "ANIMAL" as const,
    etiquetaAlcance: BoolGlobal ? "Tratamiento aplicado al lote" : "Tratamiento directo al animal",
    fecha: ObjAplicacion.fechaAplicacion,
    tipo: ObjAplicacion.tipoAplicacion.nombre,
    motivo: ObjAplicacion.motivo,
    diagnostico: ObjAplicacion.diagnostico,
    observaciones: ObjAplicacion.observaciones,
    lote: BoolGlobal && ObjAplicacion.lote ? { codigo: ObjAplicacion.lote.codigo, nombre: ObjAplicacion.lote.nombre } : null,
    detalles: Produccion_detallesSanitarios(ObjAplicacion, BoolGlobal),
  };
}

export function Produccion_construirFichaTecnica(ObjDatos: R.DatosFichaTecnica) {
  const { ObjAnimal } = ObjDatos;
  const ObjOrigen = ObjAnimal.operaciones[0]?.operacion;
  const ArrSanidad = [
    ...ObjAnimal.sanidadAplicaciones.map((Obj) => Produccion_aplicacionSanitaria(Obj, false)),
    ...ObjDatos.ArrSanidadLote.map((Obj) => Produccion_aplicacionSanitaria(Obj, true)),
  ].sort((A, B) => A.fecha.getTime() - B.fecha.getTime());
  const ObjEstadoSalida = ["VENDIDO", "FALLECIDO", "RETIRADO"].includes(ObjAnimal.estadoActual)
    ? [...ObjAnimal.historialEstados].reverse().find((Obj) => Obj.estadoNuevo === ObjAnimal.estadoActual)
    : undefined;
  const ArrTrazabilidad = [
    ...(ObjOrigen ? [{ tipo: ObjOrigen.subtipoOperacion === "NACIMIENTO" ? "NACIMIENTO" : "ALTA", fecha: ObjOrigen.fechaOperacion, descripcion: `Origen: ${ObjOrigen.subtipoOperacion}.` }] : []),
    ...ObjAnimal.asignaciones.map((Obj, IntIndice) => ({ tipo: IntIndice === 0 ? "ASIGNACION_LOTE" : "CAMBIO_LOTE", fecha: Obj.fechaInicio, descripcion: IntIndice === 0 ? `Asignado al lote ${Obj.lote.codigo}.` : `Trasladado al lote ${Obj.lote.codigo}.` })),
    ...ObjAnimal.mediciones.map((Obj) => ({ tipo: "MEDICION", fecha: Obj.fechaMedicion, descripcion: `${Obj.tipoMedicion}: ${Obj.valor.toString()} ${Obj.unidadMedida}.` })),
    ...ArrSanidad.map((Obj) => ({ tipo: Obj.alcance === "LOTE" ? "SANIDAD_LOTE" : "SANIDAD_DIRECTA", fecha: Obj.fecha, descripcion: Obj.alcance === "LOTE" ? `${Obj.etiquetaAlcance}: ${Obj.tipo} (${Obj.lote?.codigo ?? "lote"}).` : `${Obj.etiquetaAlcance}: ${Obj.tipo}.` })),
    ...ObjAnimal.historialEstados.map((Obj) => ({ tipo: "CAMBIO_ESTADO", fecha: Obj.fechaCambio, descripcion: `${Obj.estadoAnterior ?? "REGISTRO"} → ${Obj.estadoNuevo}.` })),
  ].sort((A, B) => A.fecha.getTime() - B.fecha.getTime());

  return {
    animalId: ObjAnimal.animalId,
    identificacion: ObjAnimal.identificacion,
    tipo: ObjAnimal.tipoAnimal.nombre,
    raza: ObjAnimal.raza?.nombre ?? null,
    sexo: ObjAnimal.sexo,
    fechaNacimiento: ObjAnimal.fechaNacimiento,
    fechaIngreso: ObjAnimal.fechaIngreso,
    estadoActual: ObjAnimal.estadoActual,
    observaciones: ObjAnimal.observaciones,
    madre: ObjAnimal.madre?.identificacion ?? null,
    tieneFoto: ObjAnimal.fotos.length > 0,
    origen: ObjOrigen ? { tipo: ObjOrigen.subtipoOperacion, fecha: ObjOrigen.fechaOperacion } : null,
    loteActual: ObjAnimal.asignaciones.find((Obj) => Obj.estado === "VIGENTE")?.lote ?? null,
    asignaciones: ObjAnimal.asignaciones,
    mediciones: ObjAnimal.mediciones,
    sanidad: ArrSanidad,
    historialEstados: ObjAnimal.historialEstados,
    salida: ObjEstadoSalida ? { estado: ObjEstadoSalida.estadoNuevo, fecha: ObjEstadoSalida.fechaCambio } : null,
    trazabilidad: ArrTrazabilidad,
  };
}

export async function Produccion_obtenerFichaTecnica(IntAnimalId: number) {
  const ObjDatos = await R.Produccion_obtenerDatosFichaTecnica(IntAnimalId);
  if (!ObjDatos) throw new ErrorAplicacion(404, "ANIMAL_NO_ENCONTRADO", "El animal no existe.");
  return Produccion_construirFichaTecnica(ObjDatos);
}
