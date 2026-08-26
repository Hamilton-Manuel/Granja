import { afterEach, describe, expect, it, vi } from "vitest";
import { Ventas_buscarTodosAnimalesLote, Ventas_registrar } from "./ventas.service";

const Ventas_respuesta=(ObjDatos:unknown)=>new Response(JSON.stringify(ObjDatos),{status:200,headers:{"content-type":"application/json"}});
afterEach(()=>vi.unstubAllGlobals());
describe("servicio de Ventas",()=>{
  it("envía únicamente el contrato canónico y preserva Decimal string",async()=>{const ObjFetch=vi.fn().mockResolvedValue(Ventas_respuesta({ok:true,datos:{ventaId:1}}));vi.stubGlobal("fetch",ObjFetch);await Ventas_registrar({clienteId:3,fechaVenta:"2026-08-25T08:00:00.000-06:00",formaPago:"EFECTIVO",animales:[{animalId:7,precioVenta:"4500.25"}]});const ObjOpciones=ObjFetch.mock.calls[0]![1] as RequestInit;expect(ObjFetch.mock.calls[0]![0]).toBe("/api/ventas");expect(JSON.parse(String(ObjOpciones.body))).toEqual({clienteId:3,fechaVenta:"2026-08-25T08:00:00.000-06:00",formaPago:"EFECTIVO",animales:[{animalId:7,precioVenta:"4500.25"}]});expect(String(ObjOpciones.body)).not.toMatch(/descuento|cantidad|subtotal|total|serie|numero/);expect(ObjOpciones.credentials).toBe("include");});
  it("recorre todas las páginas al seleccionar todos los animales de un lote",async()=>{const ObjFetch=vi.fn().mockResolvedValueOnce(Ventas_respuesta({ok:true,datos:[{animalId:1}],paginacion:{pagina:1,limite:100,total:2}})).mockResolvedValueOnce(Ventas_respuesta({ok:true,datos:[{animalId:2}],paginacion:{pagina:2,limite:100,total:2}}));vi.stubGlobal("fetch",ObjFetch);const Arr=await Ventas_buscarTodosAnimalesLote(9);expect(Arr).toHaveLength(2);expect(ObjFetch.mock.calls[0]![0]).toContain("loteProduccionId=9");expect(ObjFetch.mock.calls[0]![0]).toContain("limite=100");expect(ObjFetch.mock.calls[1]![0]).toContain("pagina=2");});
});
