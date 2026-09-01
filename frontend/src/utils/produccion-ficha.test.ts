import { describe, expect, it } from "vitest";
import type { FichaTecnicaAnimal } from "../types/produccion.types";
import { Produccion_crearModeloFicha } from "./produccion-ficha";

const ObjBase:FichaTecnicaAnimal={animalId:1,identificacion:"A-01",tipo:"Bovino",raza:null,sexo:"HEMBRA",fechaNacimiento:"2026-01-01",fechaIngreso:"2026-01-02T08:00:00-06:00",estadoActual:"ACTIVO",observaciones:null,madre:null,tieneFoto:false,origen:{tipo:"NACIMIENTO",fecha:"2026-01-02T08:00:00-06:00"},loteActual:null,asignaciones:[],mediciones:[],historialEstados:[],salida:null,trazabilidad:[],sanidad:[]};

describe("modelo depurado de ficha técnica",()=>{
  it("distingue tratamiento global y dosis indicada por animal",()=>{const Obj=Produccion_crearModeloFicha({...ObjBase,sanidad:[{aplicacionSanitariaId:2,alcance:"LOTE",etiquetaAlcance:"Tratamiento aplicado al lote",fecha:"2026-02-01T09:00:00-06:00",tipo:"Vacunación",motivo:"Prevención",diagnostico:null,observaciones:null,lote:{codigo:"L-1",nombre:"Lote uno"},detalles:[{producto:"Vacuna",via:"Intramuscular",dosisIndicadaPorAnimal:"2.0000",unidadClinica:"mL"},{producto:"Vitaminas",via:"Oral"}]}]});expect(Obj.sanidad[0]?.alcance).toBe("Tratamiento aplicado al lote");expect(Obj.sanidad[0]?.detalles[0]?.dosis).toContain("dosis indicada por animal");expect(Obj.sanidad[0]?.detalles[1]?.dosis).toBe("—")});
  it("no incorpora campos financieros o comerciales al modelo",()=>{const Obj=Produccion_crearModeloFicha(ObjBase);const StrJson=JSON.stringify(Obj);for(const StrCampo of ["cliente","precioVenta","costoAdquisicion","recibo","formaPago","alimentacion"])expect(StrJson).not.toContain(StrCampo)});
});
