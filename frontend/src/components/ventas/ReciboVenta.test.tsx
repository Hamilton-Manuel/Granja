import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Venta } from "../../types/ventas.types";
import { Ventas_generarReciboPdf } from "../../utils/ventas-recibo";
import { ReciboVenta } from "./ReciboVenta";

const { ObjPdf, ObjAutoTable } = vi.hoisted(() => ({
  ObjPdf: { setFont:vi.fn(), setFontSize:vi.fn(), text:vi.fn(), setTextColor:vi.fn(), addPage:vi.fn(), splitTextToSize:vi.fn((StrTexto:string)=>[StrTexto]), save:vi.fn(), lastAutoTable:{finalY:120} },
  ObjAutoTable: vi.fn(),
}));
vi.mock("jspdf",()=>({jsPDF:vi.fn(function Ventas_jsPdfSimulado(){return ObjPdf;})}));
vi.mock("jspdf-autotable",()=>({default:ObjAutoTable}));

const ObjVenta:Venta={ventaId:91,clienteId:7,fechaVenta:"2026-08-25T22:27:00.000",clienteCodigo:"CLI000015",clienteNombre:"Cliente histórico",clienteNit:"1234567-8",subtotal:"9250.00",total:"9250.00",formaPago:"EFECTIVO",estado:"CONFIRMADA",documentoReferencia:"REF-1",observaciones:"Entrega completa",fechaAnulacion:null,motivoAnulacion:null,cliente:{clienteId:7,codigo:"CAMBIADO",nombreCompleto:"Cliente actual cambiado",nit:"OTRO"},usuario:{usuarioId:2,nombreCompleto:"Responsable Venta"},usuarioAnulacion:null,recibo:{serie:"A",numero:1,estado:"EMITIDO"},detalles:[{detalleVentaId:4,loteProduccionId:3,cantidadAnimales:2,subtotal:"9250.00",lote:{loteProduccionId:3,codigo:"ENG-01",nombre:"Engorde",tipoAnimal:{tipoAnimalId:1,nombre:"Bovino"}},animales:[{detalleVentaAnimalId:10,animalId:20,precioVenta:"4500.00",animal:{animalId:20,identificacion:"ARETE-001",sexo:"HEMBRA",tipoAnimal:{tipoAnimalId:1,nombre:"Bovino"},raza:{razaId:1,nombre:"Brahman"}},asignacion:{asignacionLoteId:30,fechaInicio:"2026-01-01",fechaFin:"2026-08-25"}},{detalleVentaAnimalId:11,animalId:21,precioVenta:"4750.00",animal:{animalId:21,identificacion:"ARETE-002",sexo:"MACHO",tipoAnimal:{tipoAnimalId:1,nombre:"Bovino"},raza:null},asignacion:{asignacionLoteId:31,fechaInicio:"2026-01-01",fechaFin:"2026-08-25"}}]}]};

describe("recibo de venta",()=>{
  it("presenta snapshots, animales, lote, precios y total sin IDs técnicos",()=>{render(<ReciboVenta ObjVenta={ObjVenta}/>);expect(screen.getByText("A-000001")).toBeVisible();expect(screen.getByText("Cliente histórico")).toBeVisible();expect(screen.getByText("1234567-8")).toBeVisible();expect(screen.getAllByText("ARETE-001").length).toBeGreaterThan(0);expect(screen.getAllByText("ENG-01").length).toBeGreaterThan(0);expect(screen.getAllByText("Q4,500.00").length).toBeGreaterThan(0);expect(screen.getByText("TOTAL: Q9,250.00")).toBeVisible();expect(screen.queryByText("Cliente actual cambiado")).toBeNull();expect(screen.queryByText("91")).toBeNull();});
  it("conserva el documento y marca prominentemente una venta anulada",()=>{render(<ReciboVenta ObjVenta={{...ObjVenta,estado:"ANULADA",recibo:{serie:"A",numero:1,estado:"ANULADO"}}}/>);expect(screen.getByText("RECIBO ANULADO")).toBeVisible();expect(screen.getByText("A-000001")).toBeVisible();expect(screen.getAllByText("ARETE-002").length).toBeGreaterThan(0);});
  it("genera PDF vectorial desde datos estructurados y usa el recibo como archivo",()=>{Ventas_generarReciboPdf(ObjVenta);expect(ObjAutoTable).toHaveBeenCalledWith(ObjPdf,expect.objectContaining({body:expect.arrayContaining([expect.arrayContaining(["ARETE-001","Bovino","Brahman","ENG-01","Q4,500.00"])])}));expect(ObjPdf.save).toHaveBeenCalledWith("Recibo-A-000001.pdf");});
});
