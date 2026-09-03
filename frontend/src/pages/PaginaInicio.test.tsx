import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaInicio } from "./PaginaInicio";

const ObjSesion={ObjUsuario:{usuarioId:1,nombreCompleto:"Ana Chiflón",nombreUsuario:"ana",correo:"a@test",estado:"ACTIVO",rol:{rolId:1,nombre:"ROL"},permisos:[]as string[]},Autenticacion_tienePermiso:(P:string)=>ObjSesion.ObjUsuario.permisos.includes(P),Autenticacion_manejarErrorProtegido:()=>false};
const Dashboard_consultar=vi.fn();
vi.mock("../hooks/useSesion",()=>({useSesion:()=>ObjSesion}));
vi.mock("../services/dashboard.service",()=>({Dashboard_consultar:()=>Dashboard_consultar()}));

const ObjBase={ok:true as const,datos:{periodo:{fechaDesde:"2026-09-01",fechaHasta:"2026-09-30",zonaHoraria:"America/Guatemala"as const},bloques:{}}};
beforeEach(()=>{ObjSesion.ObjUsuario.permisos=[];Dashboard_consultar.mockReset()});

describe("Dashboard principal",()=>{
 it("muestra bienvenida y accesos operativos sin permisos de Reportes",()=>{ObjSesion.ObjUsuario.permisos=["INVENTARIO_CONSULTAR"];render(<MemoryRouter><PaginaInicio/></MemoryRouter>);expect(screen.getByRole("heading",{name:"Bienvenido a Granja El Chiflón"})).toBeInTheDocument();expect(screen.getByRole("link",{name:"Inventario"})).toHaveAttribute("href","/inventario");expect(Dashboard_consultar).not.toHaveBeenCalled()});
 it("renderiza solo los bloques autorizados y conserva enlaces a Reportes",async()=>{ObjSesion.ObjUsuario.permisos=["REPORTES_PRODUCCION_CONSULTAR"];Dashboard_consultar.mockResolvedValue({...ObjBase,datos:{...ObjBase.datos,bloques:{produccion:{animalesActivos:3,lotesActivos:1,animalesPorEstado:[{estado:"ACTIVO",cantidad:3}],animalesPorLote:[{loteProduccionId:1,codigo:"L-1",nombre:"Lote",cantidad:3}]}}}});render(<MemoryRouter><PaginaInicio/></MemoryRouter>);expect(screen.getByRole("status",{name:"Cargando produccion"})).toBeInTheDocument();expect(await screen.findByRole("link",{name:/Animales activos/})).toHaveAttribute("href","/reportes/produccion/censo");expect(screen.queryByText("Ingreso")).not.toBeInTheDocument()});
 it("soporta ceros y un error aislado sin mostrar datos restringidos",async()=>{ObjSesion.ObjUsuario.permisos=["REPORTES_INVENTARIO_CONSULTAR","REPORTES_COSTOS_CONSULTAR"];Dashboard_consultar.mockResolvedValue({...ObjBase,datos:{...ObjBase.datos,bloques:{inventario:{productosConExistencia:0,lotesConSaldo:0,existenciasBajoMinimo:0,lotesVencidos:0,lotesProximosVencer:0,proximosVencimientos:[]}},errores:{costos:{codigo:"BLOQUE_NO_DISPONIBLE",mensaje:"No fue posible cargar el resumen de costos."}}}});render(<MemoryRouter><PaginaInicio/></MemoryRouter>);expect(await screen.findByText("Sin vencimientos próximos")).toBeInTheDocument();expect(screen.getByText("No fue posible cargar el resumen de costos.")).toBeInTheDocument();expect(screen.queryByText("Ventas confirmadas")).not.toBeInTheDocument()});
 it("muestra costos vacíos como Q0.00 sin alerta roja",async()=>{ObjSesion.ObjUsuario.permisos=["REPORTES_COSTOS_CONSULTAR"];Dashboard_consultar.mockResolvedValue({...ObjBase,datos:{...ObjBase.datos,bloques:{costos:{costoAlimentacion:"0.00",costoSanidad:"0.00"}}}});render(<MemoryRouter><PaginaInicio/></MemoryRouter>);expect((await screen.findAllByText("Q0.00")).length).toBe(2);expect(screen.queryByRole("alert")).not.toBeInTheDocument()});
});
