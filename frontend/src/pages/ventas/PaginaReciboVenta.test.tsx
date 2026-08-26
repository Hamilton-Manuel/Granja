import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Venta } from "../../types/ventas.types";
import { PaginaReciboVenta } from "./PaginaReciboVenta";

const { Ventas_obtener, Ventas_generarReciboPdf }=vi.hoisted(()=>({Ventas_obtener:vi.fn(),Ventas_generarReciboPdf:vi.fn()}));
vi.mock("../../services/ventas.service",()=>({Ventas_obtener}));
vi.mock("../../utils/ventas-recibo",async ObjImportar=>{const ObjReal=await ObjImportar<typeof import("../../utils/ventas-recibo")>();return{...ObjReal,Ventas_generarReciboPdf};});
const ObjVenta:Venta={ventaId:8,clienteId:1,clienteCodigo:"CLI1",clienteNombre:"Consumidor Final",clienteNit:"CF",fechaVenta:"2026-08-25T10:00:00.000",formaPago:"EFECTIVO",estado:"CONFIRMADA",documentoReferencia:null,observaciones:null,subtotal:"100.00",total:"100.00",fechaAnulacion:null,motivoAnulacion:null,cliente:{clienteId:1,codigo:"CLI1",nombreCompleto:"Consumidor Final",nit:"CF"},usuario:{usuarioId:2,nombreCompleto:"Usuario"},usuarioAnulacion:null,recibo:{serie:"B",numero:3,estado:"EMITIDO"},detalles:[]};

describe("página de recibo",()=>{
  it("recupera únicamente el detalle y ofrece descarga, impresión y regreso",async()=>{Ventas_obtener.mockResolvedValue({datos:ObjVenta});const ObjImprimir=vi.spyOn(window,"print").mockImplementation(()=>undefined);render(<MemoryRouter initialEntries={["/ventas/8/recibo"]}><Routes><Route path="/ventas/:ventaId/recibo" element={<PaginaReciboVenta/>}/></Routes></MemoryRouter>);expect(await screen.findByText("B-000003")).toBeVisible();expect(Ventas_obtener).toHaveBeenCalledWith(8);await userEvent.click(screen.getByRole("button",{name:"Descargar PDF"}));expect(Ventas_generarReciboPdf).toHaveBeenCalledWith(ObjVenta);await userEvent.click(screen.getByRole("button",{name:"Imprimir"}));expect(ObjImprimir).toHaveBeenCalled();expect(screen.getByRole("link",{name:"Volver a ventas"})).toHaveAttribute("href","/ventas");});
  it("muestra un error accesible cuando la venta no existe",async()=>{Ventas_obtener.mockRejectedValue(new Error("No encontrada"));render(<MemoryRouter initialEntries={["/ventas/999/recibo"]}><Routes><Route path="/ventas/:ventaId/recibo" element={<PaginaReciboVenta/>}/></Routes></MemoryRouter>);await waitFor(()=>expect(screen.getByRole("alert")).toBeVisible());});
});
