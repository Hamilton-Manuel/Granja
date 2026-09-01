import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FichaTecnicaAnimal } from "../types/produccion.types";

const ObjMocks=vi.hoisted(()=>({Pdf:{setFont:vi.fn(),setFontSize:vi.fn(),text:vi.fn(),addImage:vi.fn(),addPage:vi.fn(),splitTextToSize:vi.fn((Str:string)=>[Str]),save:vi.fn(),lastAutoTable:{finalY:120}},AutoTable:vi.fn()}));
vi.mock("jspdf",()=>({jsPDF:vi.fn(function Produccion_pdfSimulado(){return ObjMocks.Pdf;})}));
vi.mock("jspdf-autotable",()=>({default:ObjMocks.AutoTable}));
import { Produccion_generarFichaPdf } from "./produccion-ficha";

const ObjFicha:FichaTecnicaAnimal={animalId:1,identificacion:"A-01",tipo:"Bovino",raza:"Brahman",sexo:"HEMBRA",fechaNacimiento:"2026-01-01",fechaIngreso:"2026-01-02T08:00:00-06:00",estadoActual:"ACTIVO",observaciones:null,madre:null,tieneFoto:true,origen:null,loteActual:null,asignaciones:[],mediciones:[],sanidad:[],historialEstados:[],salida:null,trazabilidad:[]};
class ImagenPrueba{naturalWidth=1200;naturalHeight=800;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(_StrValor:string){queueMicrotask(()=>this.onload?.());}}

describe("cabecera PDF de ficha",()=>{
  beforeEach(()=>{for(const ObjFuncion of Object.values(ObjMocks.Pdf))if(typeof ObjFuncion==="function"&&"mockClear"in ObjFuncion)(ObjFuncion as ReturnType<typeof vi.fn>).mockClear();ObjMocks.AutoTable.mockClear();vi.stubGlobal("Image",ImagenPrueba);});
  it("incorpora fotografía grande sin deformarla",async()=>{await Produccion_generarFichaPdf(ObjFicha,new Blob(["foto"],{type:"image/webp"}));expect(ObjMocks.Pdf.addImage).toHaveBeenCalledOnce();const ArrArgumentos=ObjMocks.Pdf.addImage.mock.calls[0]!;expect(ArrArgumentos[4]).toBeGreaterThanOrEqual(45);expect(ArrArgumentos[4]).toBeLessThanOrEqual(52);expect(Number(ArrArgumentos[4])/Number(ArrArgumentos[5])).toBeCloseTo(1.5);expect(ObjMocks.Pdf.text).toHaveBeenCalledWith("Sexo: HEMBRA",73,59);});
  it("genera distribución compacta sin fotografía",async()=>{await Produccion_generarFichaPdf({...ObjFicha,tieneFoto:false},null);expect(ObjMocks.Pdf.addImage).not.toHaveBeenCalled();expect(ObjMocks.Pdf.text).toHaveBeenCalledWith("A-01",15,37);expect(ObjMocks.Pdf.save).toHaveBeenCalledWith("ficha-tecnica-A-01.pdf");});
});
