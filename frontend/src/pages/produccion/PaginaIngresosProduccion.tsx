import { useEffect, useState } from "react";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { FormularioAnimal } from "../../components/produccion/FormularioAnimal";
import { useSesion } from "../../hooks/useSesion";
import * as S from "../../services/produccion.service";
import type { AnimalCompra, AnimalIngreso, LoteProduccion, ProveedorProduccion, RazaAnimal } from "../../types/produccion.types";
import { Produccion_mensajeError } from "../../hooks/useProduccionLista";
import { Produccion_sumarDecimales } from "../../utils/produccion";

type ModoIngreso = "INICIAL" | "NACIMIENTO" | "COMPRA";

export function PaginaIngresosProduccion() {
  const { Autenticacion_tienePermiso } = useSesion();
  const ArrModos: ModoIngreso[] = [
    ...(Autenticacion_tienePermiso("PRODUCCION_INGRESOS_INICIALES_CREAR") ? ["INICIAL" as const] : []),
    ...(Autenticacion_tienePermiso("PRODUCCION_NACIMIENTOS_CREAR") ? ["NACIMIENTO" as const] : []),
    ...(Autenticacion_tienePermiso("PRODUCCION_COMPRAS_CREAR") ? ["COMPRA" as const] : []),
  ];
  const [StrModo, establecerModo] = useState<ModoIngreso>(ArrModos[0] ?? "NACIMIENTO");
  const [ArrLotes, establecerLotes] = useState<LoteProduccion[]>([]);
  const [ArrRazas, establecerRazas] = useState<RazaAnimal[]>([]);
  const [StrLote, establecerLote] = useState("");
  const [ObjProveedor, establecerProveedor] = useState<ProveedorProduccion | null>(null);
  const [StrDocumento, establecerDocumento] = useState("");
  const [ArrAnimales, establecerAnimales] = useState<Array<AnimalIngreso & { costoAdquisicion?: string }>>([]);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [StrMensaje, establecerMensaje] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      S.Produccion_listarLotes({ pagina: 1, limite: 100, estado: "ACTIVO" }),
      S.Produccion_listarRazas({ pagina: 1, limite: 100, estado: "ACTIVO" }),
    ]).then(([ObjLotes, ObjRazas]) => { establecerLotes(ObjLotes.datos); establecerRazas(ObjRazas.datos); });
  }, []);

  const ObjLote = ArrLotes.find((ObjActual) => ObjActual.loteProduccionId === Number(StrLote));
  async function Produccion_buscarProveedores(StrBusqueda: string) {
    return (await S.Produccion_listarProveedores({ pagina: 1, limite: 10, busqueda: StrBusqueda })).datos;
  }
  async function Produccion_registrar() {
    if (!ObjLote || !ArrAnimales.length || (StrModo === "COMPRA" && !ObjProveedor)) return;
    establecerProcesando(true); establecerMensaje(null);
    try {
      if (StrModo === "INICIAL") await S.Produccion_registrarInicial({ loteDestinoId: ObjLote.loteProduccionId, documentoReferencia: StrDocumento || null, animales: ArrAnimales });
      else if (StrModo === "NACIMIENTO") await S.Produccion_registrarNacimiento({ loteDestinoId: ObjLote.loteProduccionId, animales: ArrAnimales });
      else await S.Produccion_registrarCompra({ proveedorId: ObjProveedor!.proveedorId, loteDestinoId: ObjLote.loteProduccionId, documentoReferencia: StrDocumento || null, animales: ArrAnimales as AnimalCompra[] });
      establecerAnimales([]); establecerMensaje("Ingreso registrado correctamente.");
    } catch (ObjError) { establecerMensaje(Produccion_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }

  return <div className="produccion-contenido">
    <h2>Ingresos</h2>
    <p>Cada operación tiene permiso y contrato independiente; no se puede crear un lote desde aquí.</p>
    <div className="produccion-pestanas">{ArrModos.map((StrOpcion) => <button key={StrOpcion} aria-pressed={StrModo === StrOpcion} onClick={() => { establecerModo(StrOpcion); establecerAnimales([]); establecerProveedor(null); }}>{StrOpcion === "INICIAL" ? "Carga inicial" : StrOpcion === "NACIMIENTO" ? "Nacimiento" : "Compra"}</button>)}</div>
    <section className="produccion-panel produccion-contexto-operacion">
      <label>Lote destino activo<select value={StrLote} onChange={(ObjEvento) => { establecerLote(ObjEvento.target.value); establecerAnimales([]); }}><option value="">Seleccione</option>{ArrLotes.map((ObjActual) => <option key={ObjActual.loteProduccionId} value={ObjActual.loteProduccionId}>{ObjActual.codigo} · {ObjActual.nombre}</option>)}</select></label>
      {StrModo === "COMPRA" && <Autocomplete StrEtiqueta="Proveedor" StrPlaceholder="Buscar por código o nombre..." ObjSeleccion={ObjProveedor} Autocomplete_buscar={Produccion_buscarProveedores} Autocomplete_clave={(ObjActual) => ObjActual.proveedorId} Autocomplete_etiqueta={(ObjActual) => `${ObjActual.codigo} — ${ObjActual.nombreComercial || ObjActual.nombre}`} Autocomplete_seleccionar={establecerProveedor} />}
      {StrModo !== "NACIMIENTO" && <label>Documento de referencia<input value={StrDocumento} onChange={(ObjEvento) => establecerDocumento(ObjEvento.target.value)} /></label>}
    </section>
    {ObjLote && <FormularioAnimal key={`${ObjLote.loteProduccionId}-${StrModo}`} ObjLote={ObjLote} ArrRazas={ArrRazas} BoolCosto={StrModo === "COMPRA"} BoolProcesando={BoolProcesando} Produccion_guardar={async (ObjAnimal) => establecerAnimales((ArrActuales) => [...ArrActuales, ObjAnimal])} />}
    <section className="produccion-panel"><h3>Animales preparados: {ArrAnimales.length}</h3>{ArrAnimales.map((ObjAnimal, IntIndice) => <p key={`${ObjAnimal.identificacion}-${IntIndice}`}>{ObjAnimal.identificacion}{ObjAnimal.costoAdquisicion ? ` · Q ${ObjAnimal.costoAdquisicion}` : ""} <button onClick={() => establecerAnimales((ArrActuales) => ArrActuales.filter((_, IntActual) => IntActual !== IntIndice))}>Quitar</button></p>)}{StrModo === "COMPRA" && ArrAnimales.length > 0 && <p><strong>Total exacto: Q {Produccion_sumarDecimales(ArrAnimales.map((ObjAnimal) => ObjAnimal.costoAdquisicion ?? "0"))}</strong></p>}<button className="boton-primario" disabled={BoolProcesando || !ArrAnimales.length || (StrModo === "COMPRA" && !ObjProveedor)} onClick={() => void Produccion_registrar()}>Confirmar {StrModo.toLowerCase()}</button>{StrMensaje && <p role="status">{StrMensaje}</p>}</section>
  </div>;
}
