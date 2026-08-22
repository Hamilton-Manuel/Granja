import { useEffect, useId, useRef, useState } from "react";

interface PropiedadesAutocomplete<T> {
  StrEtiqueta: string;
  StrPlaceholder: string;
  ObjSeleccion: T | null;
  Autocomplete_buscar: (StrBusqueda: string) => Promise<T[]>;
  Autocomplete_etiqueta: (ObjOpcion: T) => string;
  Autocomplete_clave: (ObjOpcion: T) => string | number;
  Autocomplete_seleccionar: (ObjOpcion: T | null) => void;
}

export function Autocomplete<T>({ StrEtiqueta, StrPlaceholder, ObjSeleccion, Autocomplete_buscar, Autocomplete_etiqueta, Autocomplete_clave, Autocomplete_seleccionar }: PropiedadesAutocomplete<T>) {
  const StrId = useId();
  const [StrBusqueda, establecerBusqueda] = useState(ObjSeleccion ? Autocomplete_etiqueta(ObjSeleccion) : "");
  const [ArrOpciones, establecerOpciones] = useState<T[]>([]);
  const [StrEstado, establecerEstado] = useState<"reposo" | "cargando" | "error">("reposo");
  const [BoolAbierto, establecerAbierto] = useState(false);
  const [IntActivo, establecerActivo] = useState(-1);
  const BoolSeleccionando = useRef(false);
  const RefBuscar = useRef(Autocomplete_buscar); RefBuscar.current = Autocomplete_buscar;
  const RefEtiqueta = useRef(Autocomplete_etiqueta); RefEtiqueta.current = Autocomplete_etiqueta;
  useEffect(() => { if (ObjSeleccion) establecerBusqueda(RefEtiqueta.current(ObjSeleccion)); }, [ObjSeleccion]);
  useEffect(() => { if (!BoolAbierto || ObjSeleccion || StrBusqueda.trim().length < 1) { establecerOpciones([]); return; } const IntTemporizador = window.setTimeout(() => { establecerEstado("cargando"); void RefBuscar.current(StrBusqueda.trim()).then(ArrResultado => { establecerOpciones(ArrResultado); establecerEstado("reposo"); establecerActivo(ArrResultado.length ? 0 : -1); }).catch(() => establecerEstado("error")); }, 300); return () => window.clearTimeout(IntTemporizador); }, [StrBusqueda, BoolAbierto, ObjSeleccion]);
  function Autocomplete_elegir(ObjOpcion: T) { BoolSeleccionando.current = true; Autocomplete_seleccionar(ObjOpcion); establecerBusqueda(Autocomplete_etiqueta(ObjOpcion)); establecerAbierto(false); establecerOpciones([]); }
  return <div className="autocomplete"><label htmlFor={StrId}>{StrEtiqueta}</label><div className="autocomplete-control"><input id={StrId} role="combobox" aria-expanded={BoolAbierto} aria-controls={`${StrId}-lista`} aria-autocomplete="list" aria-activedescendant={IntActivo >= 0 ? `${StrId}-opcion-${IntActivo}` : undefined} placeholder={StrPlaceholder} value={StrBusqueda} onFocus={() => establecerAbierto(true)} onBlur={() => window.setTimeout(() => { if (!BoolSeleccionando.current) establecerAbierto(false); BoolSeleccionando.current = false; }, 100)} onChange={(E) => { establecerBusqueda(E.target.value); Autocomplete_seleccionar(null); establecerAbierto(true); }} onKeyDown={(E) => { if (E.key === "ArrowDown") { E.preventDefault(); establecerActivo(IntValor => Math.min(IntValor + 1, ArrOpciones.length - 1)); } else if (E.key === "ArrowUp") { E.preventDefault(); establecerActivo(IntValor => Math.max(IntValor - 1, 0)); } else if (E.key === "Enter" && IntActivo >= 0 && ArrOpciones[IntActivo]) { E.preventDefault(); Autocomplete_elegir(ArrOpciones[IntActivo]); } else if (E.key === "Escape") establecerAbierto(false); }} />{ObjSeleccion && <button type="button" aria-label={`Limpiar ${StrEtiqueta}`} onClick={() => { Autocomplete_seleccionar(null); establecerBusqueda(""); establecerAbierto(false); }}>×</button>}</div>{BoolAbierto && StrBusqueda.trim() && !ObjSeleccion && <div id={`${StrId}-lista`} role="listbox" className="autocomplete-lista">{StrEstado === "cargando" && <p role="status">Buscando…</p>}{StrEstado === "error" && <p role="alert">No fue posible buscar.</p>}{StrEstado === "reposo" && ArrOpciones.length === 0 && <p>Sin resultados.</p>}{ArrOpciones.map((ObjOpcion, IntIndice) => <button type="button" role="option" aria-selected={IntActivo === IntIndice} id={`${StrId}-opcion-${IntIndice}`} key={Autocomplete_clave(ObjOpcion)} onMouseDown={(E) => E.preventDefault()} onClick={() => Autocomplete_elegir(ObjOpcion)}>{Autocomplete_etiqueta(ObjOpcion)}</button>)}</div>}</div>;
}
