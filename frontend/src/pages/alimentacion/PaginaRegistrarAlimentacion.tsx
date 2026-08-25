import { useEffect, useRef, useState } from "react";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Modal } from "../../components/ui/Modal";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import {
  Alimentacion_buscarAlmacenes,
  Alimentacion_buscarDestinosAnimales,
  Alimentacion_buscarDestinosLotes,
  Alimentacion_buscarExistencias,
  Alimentacion_buscarLotesInventario,
  Alimentacion_listarFormulas,
  Alimentacion_listarProductos,
  Alimentacion_registrar,
} from "../../services/alimentacion.service";
import type {
  AlmacenAlimentacion,
  DestinoAnimalAlimentacion,
  DestinoLoteAlimentacion,
  ExistenciaAlimentacion,
  FormulaAlimentacion,
  LoteFuenteAlimentacion,
  ProductoAlimentacion,
} from "../../types/alimentacion.types";

interface LineaFormulario {
  IntClave: number;
  ObjProducto: ProductoAlimentacion | null;
  ObjAlmacen: AlmacenAlimentacion | null;
  ObjLote: LoteFuenteAlimentacion | null;
  ArrExistencias: ExistenciaAlimentacion[];
  StrCantidad: string;
}

function Alimentacion_nuevaLinea(IntClave: number): LineaFormulario {
  return { IntClave, ObjProducto: null, ObjAlmacen: null, ObjLote: null, ArrExistencias: [], StrCantidad: "" };
}

function Alimentacion_fechaBackend(StrFecha: string): string {
  return `${StrFecha}:00.000-06:00`;
}

export function PaginaRegistrarAlimentacion() {
  const IntSiguienteClave = useRef(2);
  const [StrTipoDestino, establecerTipoDestino] = useState<"ANIMAL" | "LOTE">("ANIMAL");
  const [ObjAnimal, establecerAnimal] = useState<DestinoAnimalAlimentacion | null>(null);
  const [ObjLoteProduccion, establecerLoteProduccion] = useState<DestinoLoteAlimentacion | null>(null);
  const [StrFecha, establecerFecha] = useState("");
  const [StrObservaciones, establecerObservaciones] = useState("");
  const [ArrProductos, establecerProductos] = useState<ProductoAlimentacion[]>([]);
  const [ArrFormulas, establecerFormulas] = useState<FormulaAlimentacion[]>([]);
  const [IntFormulaId, establecerFormulaId] = useState<number | null>(null);
  const [ArrLineas, establecerLineas] = useState<LineaFormulario[]>([Alimentacion_nuevaLinea(1)]);
  const [BoolConfirmar, establecerConfirmar] = useState(false);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const [StrExito, establecerExito] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([Alimentacion_listarProductos(), Alimentacion_listarFormulas()])
      .then(([ObjProductos, ObjFormulas]) => {
        establecerProductos(ObjProductos.datos.filter((Obj) => Obj.activo && Obj.habilitacionAlimentacion?.activo));
        establecerFormulas(ObjFormulas.datos.filter((Obj) => Obj.activo));
      })
      .catch((ObjError) => establecerError(Alimentacion_mensajeError(ObjError)));
  }, []);

  async function Alimentacion_aplicarFormula(IntId: number | null) {
    establecerFormulaId(IntId);
    if (IntId === null) return;
    const ObjFormula = ArrFormulas.find((Obj) => Obj.formulaId === IntId);
    if (!ObjFormula) return;
    const ArrPrecarga = await Promise.all(ObjFormula.detalles.filter((Obj) => Obj.activo).map(async (ObjDetalle) => {
      const ObjProducto = ArrProductos.find((Obj) => Obj.productoId === ObjDetalle.productoId) ?? null;
      return { ...Alimentacion_nuevaLinea(IntSiguienteClave.current++), ObjProducto, StrCantidad: ObjDetalle.cantidad, ArrExistencias: ObjProducto ? await Alimentacion_buscarExistencias(ObjProducto.productoId) : [] };
    }));
    establecerLineas(ArrPrecarga);
  }

  async function Alimentacion_seleccionarProducto(IntClave: number, ObjProducto: ProductoAlimentacion | null) {
    const ArrExistencias = ObjProducto ? await Alimentacion_buscarExistencias(ObjProducto.productoId) : [];
    establecerLineas((ArrActual) => ArrActual.map((ObjLinea) => ObjLinea.IntClave === IntClave ? { ...ObjLinea, ObjProducto, ObjAlmacen: null, ObjLote: null, ArrExistencias } : ObjLinea));
  }

  function Alimentacion_actualizarLinea(IntClave: number, ObjCambio: Partial<LineaFormulario>) {
    establecerLineas((ArrActual) => ArrActual.map((ObjLinea) => ObjLinea.IntClave === IntClave ? { ...ObjLinea, ...ObjCambio } : ObjLinea));
  }

  function Alimentacion_validar(): string | null {
    if (!(StrTipoDestino === "ANIMAL" ? ObjAnimal : ObjLoteProduccion)) return "Seleccione un destino válido.";
    if (!StrFecha) return "Indique la fecha y hora efectiva del suministro.";
    if (ArrLineas.length === 0) return "Agregue al menos un alimento.";
    const ArrFuentes = new Set<string>();
    for (const ObjLinea of ArrLineas) {
      if (!ObjLinea.ObjProducto || !ObjLinea.ObjAlmacen) return "Complete producto y almacén en todas las líneas.";
      if (ObjLinea.ObjProducto.manejaLotes && !ObjLinea.ObjLote) return `Seleccione lote de Inventario para ${ObjLinea.ObjProducto.nombre}.`;
      if (!/^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/.test(ObjLinea.StrCantidad)) return "Las cantidades deben ser decimales positivos con máximo cuatro decimales.";
      const StrFuente = `${ObjLinea.ObjProducto.productoId}:${ObjLinea.ObjAlmacen.inventarioId}:${ObjLinea.ObjLote?.loteInventarioId ?? "SIN_LOTE"}`;
      if (ArrFuentes.has(StrFuente)) return "Una misma fuente física no puede repetirse. Unifique su cantidad en una sola línea.";
      ArrFuentes.add(StrFuente);
    }
    return null;
  }

  async function Alimentacion_confirmarRegistro() {
    const StrValidacion = Alimentacion_validar();
    if (StrValidacion) { establecerError(StrValidacion); establecerConfirmar(false); return; }
    establecerProcesando(true);
    establecerError(null);
    try {
      const ObjRespuesta = await Alimentacion_registrar({
        ...(IntFormulaId ? { formulaId: IntFormulaId } : {}),
        fechaEfectiva: Alimentacion_fechaBackend(StrFecha),
        destino: StrTipoDestino === "ANIMAL" ? { tipo: "ANIMAL", animalId: ObjAnimal!.animalId } : { tipo: "LOTE", loteProduccionId: ObjLoteProduccion!.loteProduccionId },
        observaciones: StrObservaciones.trim() || null,
        detalles: ArrLineas.map((ObjLinea) => ({
          productoId: ObjLinea.ObjProducto!.productoId,
          inventarioId: ObjLinea.ObjAlmacen!.inventarioId,
          ...(ObjLinea.ObjLote ? { loteInventarioId: ObjLinea.ObjLote.loteInventarioId } : {}),
          cantidad: ObjLinea.StrCantidad,
        })),
      });
      establecerExito(`Alimentación ${ObjRespuesta.datos.alimentacionId} registrada correctamente.`);
      establecerConfirmar(false);
      establecerAnimal(null); establecerLoteProduccion(null); establecerFormulaId(null); establecerFecha(""); establecerObservaciones("");
      establecerLineas([Alimentacion_nuevaLinea(IntSiguienteClave.current++)]);
    } catch (ObjError) { establecerError(Alimentacion_mensajeError(ObjError)); establecerConfirmar(false); }
    finally { establecerProcesando(false); }
  }

  return <div className="alimentacion-contenido">
    <header className="alimentacion-seccion-encabezado"><div><h2>Registrar alimentación</h2><p>Consumo real de insumos asociado a un animal o lote de Producción.</p></div></header>
    {StrError && <p className="mensaje-error" role="alert">{StrError}</p>}
    {StrExito && <p className="mensaje-exito" role="status">{StrExito}</p>}
    <section className="alimentacion-formulario alimentacion-registro">
      <fieldset><legend>Destino</legend><div className="alimentacion-selector-destino"><label><input type="radio" checked={StrTipoDestino === "ANIMAL"} onChange={() => { establecerTipoDestino("ANIMAL"); establecerLoteProduccion(null); }} /> Animal</label><label><input type="radio" checked={StrTipoDestino === "LOTE"} onChange={() => { establecerTipoDestino("LOTE"); establecerAnimal(null); }} /> Lote</label></div>
      {StrTipoDestino === "ANIMAL" ? <Autocomplete StrEtiqueta="Animal" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={ObjAnimal} Autocomplete_buscar={Alimentacion_buscarDestinosAnimales} Autocomplete_clave={(Obj) => Obj.animalId} Autocomplete_etiqueta={(Obj) => `${Obj.identificacion} — ${Obj.tipoAnimal.nombre} — ${Obj.loteVigente.codigo}`} Autocomplete_seleccionar={establecerAnimal} /> : <Autocomplete StrEtiqueta="Lote de Producción" StrPlaceholder="Buscar por código o nombre..." ObjSeleccion={ObjLoteProduccion} Autocomplete_buscar={Alimentacion_buscarDestinosLotes} Autocomplete_clave={(Obj) => Obj.loteProduccionId} Autocomplete_etiqueta={(Obj) => `${Obj.codigo} — ${Obj.nombre} — ${Obj.tipoAnimal.nombre}`} Autocomplete_seleccionar={establecerLoteProduccion} />}</fieldset>
      <div className="alimentacion-contexto-registro">
        <label>Fecha y hora efectiva<input type="datetime-local" required value={StrFecha} onChange={(E) => establecerFecha(E.target.value)} /></label>
        <label>Fórmula (opcional)<select value={IntFormulaId ?? ""} onChange={(E) => void Alimentacion_aplicarFormula(E.target.value ? Number(E.target.value) : null)}><option value="">Consumo directo</option>{ArrFormulas.map((Obj) => <option key={Obj.formulaId} value={Obj.formulaId}>{Obj.nombre}</option>)}</select></label>
      </div>
      <fieldset><legend>Alimentos y fuentes físicas</legend>{ArrLineas.map((ObjLinea, IntIndice) => <article className="alimentacion-linea-registro" key={ObjLinea.IntClave}>
        <Autocomplete StrEtiqueta={`Producto ${IntIndice + 1}`} StrPlaceholder="Buscar por código o nombre..." ObjSeleccion={ObjLinea.ObjProducto} Autocomplete_buscar={async (StrBusqueda) => ArrProductos.filter((Obj) => `${Obj.codigo} ${Obj.nombre}`.toLocaleLowerCase().includes(StrBusqueda.toLocaleLowerCase()))} Autocomplete_clave={(Obj) => Obj.productoId} Autocomplete_etiqueta={(Obj) => `${Obj.codigo} — ${Obj.nombre} — ${Obj.unidadMedida}`} Autocomplete_seleccionar={(Obj) => void Alimentacion_seleccionarProducto(ObjLinea.IntClave, Obj)} />
        {ObjLinea.ObjProducto && <Autocomplete StrEtiqueta="Almacén" StrPlaceholder="Buscar por código o nombre..." ObjSeleccion={ObjLinea.ObjAlmacen} Autocomplete_buscar={async (StrBusqueda) => { const ArrAlmacenes = await Alimentacion_buscarAlmacenes(StrBusqueda); const ArrIds = new Set(ObjLinea.ArrExistencias.map((Obj) => Obj.inventarioId)); return ArrAlmacenes.filter((Obj) => ArrIds.has(Obj.inventarioId)); }} Autocomplete_clave={(Obj) => Obj.inventarioId} Autocomplete_etiqueta={(Obj) => `${Obj.codigo} — ${Obj.nombre}`} Autocomplete_seleccionar={(Obj) => Alimentacion_actualizarLinea(ObjLinea.IntClave, { ObjAlmacen: Obj, ObjLote: null })} />}
        {ObjLinea.ObjProducto?.manejaLotes && ObjLinea.ObjAlmacen && (StrFecha ? <Autocomplete StrEtiqueta="Lote de Inventario" StrPlaceholder="Buscar lote..." ObjSeleccion={ObjLinea.ObjLote} Autocomplete_buscar={async (StrBusqueda) => (await Alimentacion_buscarLotesInventario(ObjLinea.ObjProducto!.productoId, ObjLinea.ObjAlmacen!.inventarioId, Alimentacion_fechaBackend(StrFecha))).filter((Obj) => Obj.codigoLote.toLocaleLowerCase().includes(StrBusqueda.toLocaleLowerCase()))} Autocomplete_clave={(Obj) => Obj.loteInventarioId} Autocomplete_etiqueta={(Obj) => `${Obj.codigoLote} — Disponible: ${Obj.cantidadDisponible} ${ObjLinea.ObjProducto!.unidadMedida} — ${Obj.fechaVencimiento ? `Vence: ${Obj.fechaVencimiento}` : "Sin vencimiento"}`} Autocomplete_seleccionar={(Obj) => Alimentacion_actualizarLinea(ObjLinea.IntClave, { ObjLote: Obj })} /> : <p className="alimentacion-aviso">Indique la fecha efectiva para consultar lotes utilizables.</p>)}
        {ObjLinea.ObjProducto && <label>Cantidad ({ObjLinea.ObjProducto.unidadMedida})<input inputMode="decimal" required value={ObjLinea.StrCantidad} onChange={(E) => Alimentacion_actualizarLinea(ObjLinea.IntClave, { StrCantidad: E.target.value })} /></label>}
        <button type="button" className="boton-secundario" disabled={ArrLineas.length === 1} onClick={() => establecerLineas((Arr) => Arr.filter((Obj) => Obj.IntClave !== ObjLinea.IntClave))}>Quitar alimento</button>
      </article>)}<button type="button" className="boton-secundario" onClick={() => establecerLineas((Arr) => [...Arr, Alimentacion_nuevaLinea(IntSiguienteClave.current++)])}>Agregar alimento</button></fieldset>
      <label className="alimentacion-observaciones">Observaciones<textarea maxLength={1000} value={StrObservaciones} onChange={(E) => establecerObservaciones(E.target.value)} /></label>
      <button type="button" className="boton-primario" disabled={BoolProcesando} onClick={() => { const StrValidacion = Alimentacion_validar(); if (StrValidacion) establecerError(StrValidacion); else establecerConfirmar(true); }}>Revisar y confirmar</button>
    </section>
    <Modal BoolAbierto={BoolConfirmar} StrTitulo="Confirmar alimentación" Autenticacion_cerrar={() => establecerConfirmar(false)}><div className="alimentacion-resumen-confirmacion"><p><strong>Destino:</strong> {StrTipoDestino === "ANIMAL" ? ObjAnimal?.identificacion : ObjLoteProduccion?.codigo}</p><p><strong>Fecha:</strong> {StrFecha.replace("T", " ")}</p><p><strong>Fórmula:</strong> {ArrFormulas.find((Obj) => Obj.formulaId === IntFormulaId)?.nombre ?? "Sin fórmula"}</p><ul>{ArrLineas.map((Obj) => <li key={Obj.IntClave}>{Obj.ObjProducto?.nombre} — {Obj.ObjAlmacen?.nombre}{Obj.ObjLote ? ` — ${Obj.ObjLote.codigoLote}` : ""} — {Obj.StrCantidad} {Obj.ObjProducto?.unidadMedida}</li>)}</ul><button className="boton-primario" disabled={BoolProcesando} onClick={() => void Alimentacion_confirmarRegistro()}>{BoolProcesando ? "Registrando…" : "Confirmar alimentación"}</button></div></Modal>
  </div>;
}
