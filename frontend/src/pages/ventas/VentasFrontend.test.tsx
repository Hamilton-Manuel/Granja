import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayoutVentas } from "../../components/ventas/LayoutVentas";
import { PaginaRegistrarVenta } from "./PaginaRegistrarVenta";

const ObjPermisos=vi.hoisted(()=>({Arr:[] as string[]}));
vi.mock("../../hooks/useSesion",()=>({useSesion:()=>({Autenticacion_tienePermiso:(StrPermiso:string)=>ObjPermisos.Arr.includes(StrPermiso)})}));
vi.mock("../../services/ventas.service",()=>({Ventas_buscarClientes:vi.fn().mockResolvedValue([]),Ventas_buscarLotes:vi.fn().mockResolvedValue([]),Ventas_buscarAnimales:vi.fn().mockResolvedValue([]),Ventas_buscarTodosAnimalesLote:vi.fn().mockResolvedValue([]),Ventas_registrar:vi.fn(),Ventas_diagnosticar:vi.fn(),Ventas_anular:vi.fn(),Ventas_obtener:vi.fn(),Ventas_listar:vi.fn()}));

describe("frontend Ventas",()=>{
  it("limita al OPERADOR por permisos reales, no por nombre de rol",()=>{ObjPermisos.Arr=["VENTAS_CONSULTAR","VENTAS_REGISTRAR"];render(<MemoryRouter><LayoutVentas/></MemoryRouter>);expect(screen.getByRole("link",{name:"Historial"})).toBeVisible();expect(screen.getByRole("link",{name:"Registrar"})).toBeVisible();expect(screen.queryByRole("link",{name:"Diagnóstico"})).toBeNull();});
  it("presenta captura legible sin inputs de IDs técnicos ni descuento",()=>{render(<MemoryRouter><PaginaRegistrarVenta/></MemoryRouter>);expect(screen.getByLabelText("Cliente")).toHaveAttribute("placeholder","Buscar por código, nombre o NIT...");expect(screen.getByLabelText("Animal")).toHaveAttribute("placeholder","Buscar por código o identificación...");expect(screen.getByLabelText("Fecha y hora efectiva")).toHaveAttribute("type","datetime-local");expect(screen.getByLabelText("Forma de pago")).toBeVisible();expect(screen.queryByLabelText(/clienteId|animalId|loteProduccionId|ventaId/i)).toBeNull();expect(screen.queryByText(/descuento/i)).toBeNull();});
});
