import { useState } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { Sanidad_mensajeError } from "../../hooks/useSanidad";
import { Sanidad_diagnosticar } from "../../services/sanidad.service";
import type { DiagnosticoSanidad } from "../../types/sanidad.types";

export function PaginaDiagnosticoSanidad() {
  const [BoolConfirmar, establecerConfirmar] = useState(false);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [ObjDiagnostico, establecerDiagnostico] = useState<DiagnosticoSanidad | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  async function Sanidad_ejecutarDiagnostico() {
    establecerProcesando(true);
    try { establecerDiagnostico((await Sanidad_diagnosticar()).datos); establecerConfirmar(false); }
    catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }
  return <div className="alimentacion-contenido"><header className="alimentacion-seccion-encabezado"><div><h2>Diagnóstico de consistencia</h2><p>Comprueba Sanidad, Inventario y Producción sin corregir datos.</p></div><button className="boton-primario" type="button" onClick={() => establecerConfirmar(true)}>Ejecutar diagnóstico</button></header>
    <p className="alimentacion-aviso">El diagnóstico no autocorrige ni modifica saldos.</p>{StrError && <p role="alert">{StrError}</p>}
    {ObjDiagnostico && <section className={ObjDiagnostico.consistente ? "alimentacion-correcto" : "alimentacion-alerta"} role="status"><h3>Consistente: {ObjDiagnostico.consistente ? "Sí" : "No"}</h3><div className="alimentacion-metricas"><article><span>Fuentes revisadas</span><strong>{ObjDiagnostico.fuentesRevisadas}</strong></article><article><span>Movimientos revisados</span><strong>{ObjDiagnostico.movimientosRevisados}</strong></article><article><span>Diferencias</span><strong>{ObjDiagnostico.diferencias.length}</strong></article></div>{ObjDiagnostico.diferencias.length > 0 && <ul>{ObjDiagnostico.diferencias.map((ObjDiferencia, IntIndice) => <li key={`${ObjDiferencia.tipo}-${IntIndice}`}>{ObjDiferencia.tipo}: esperado {ObjDiferencia.esperado}, actual {ObjDiferencia.actual}</li>)}</ul>}</section>}
    <DialogoConfirmacion BoolAbierto={BoolConfirmar} StrTitulo="Ejecutar diagnóstico" StrMensaje="Se revisará la consistencia. No se corregirá información automáticamente." StrConfirmar="Ejecutar" BoolProcesando={BoolProcesando} Autenticacion_cancelar={() => establecerConfirmar(false)} Autenticacion_confirmar={() => void Sanidad_ejecutarDiagnostico()} />
  </div>;
}
