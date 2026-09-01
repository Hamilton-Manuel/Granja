import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FichaTecnicaAnimal } from "../../types/produccion.types";
import { PaginaFichaTecnicaAnimal } from "./PaginaFichaTecnicaAnimal";

const ObjMocks=vi.hoisted(()=>({obtenerFicha:vi.fn(),obtenerFoto:vi.fn(),reemplazarFoto:vi.fn(),generarPdf:vi.fn()}));
vi.mock("../../services/produccion.service",()=>({Produccion_obtenerFichaTecnica:ObjMocks.obtenerFicha,Produccion_obtenerFoto:ObjMocks.obtenerFoto,Produccion_reemplazarFoto:ObjMocks.reemplazarFoto}));
vi.mock("../../hooks/useSesion",()=>({useSesion:()=>({Autenticacion_tienePermiso:(StrPermiso:string)=>StrPermiso==="PRODUCCION_ANIMALES_EDITAR"})}));
vi.mock("../../utils/produccion-ficha",async(ImportarOriginal)=>{const ObjOriginal=await ImportarOriginal<typeof import("../../utils/produccion-ficha")>();return{...ObjOriginal,Produccion_generarFichaPdf:ObjMocks.generarPdf};});

const ObjFicha:FichaTecnicaAnimal={animalId:1,identificacion:"A-01",tipo:"Bovino",raza:"Brahman",sexo:"HEMBRA",fechaNacimiento:"2026-01-01",fechaIngreso:"2026-01-02T08:00:00-06:00",estadoActual:"ACTIVO",observaciones:"Animal sano",madre:null,tieneFoto:true,origen:{tipo:"NACIMIENTO",fecha:"2026-01-02T08:00:00-06:00"},loteActual:{loteProduccionId:2,codigo:"L-1",nombre:"Lote uno",estado:"ACTIVO"},asignaciones:[],mediciones:[],sanidad:[],historialEstados:[],salida:null,trazabilidad:[]};
function Produccion_renderizar(){return render(<MemoryRouter initialEntries={["/produccion/animales/1/ficha"]}><Routes><Route path="/produccion/animales/:animalId/ficha" element={<PaginaFichaTecnicaAnimal/>}/></Routes></MemoryRouter>)}

describe("presentación de ficha técnica",()=>{
  beforeEach(()=>{ObjMocks.obtenerFicha.mockReset();ObjMocks.obtenerFoto.mockReset();ObjMocks.reemplazarFoto.mockReset();ObjMocks.generarPdf.mockReset();vi.stubGlobal("URL",{...URL,createObjectURL:vi.fn(()=>"blob:foto-animal"),revokeObjectURL:vi.fn()});});
  it("amplía la fotografía existente y permite cerrar el modal",async()=>{ObjMocks.obtenerFicha.mockResolvedValue({datos:ObjFicha});ObjMocks.obtenerFoto.mockResolvedValue(new Blob(["foto"],{type:"image/webp"}));Produccion_renderizar();const ObjAbrir=await screen.findByRole("button",{name:"Ver fotografía ampliada de A-01"});expect(screen.getByText("Cambiar fotografía")).toBeVisible();await userEvent.click(ObjAbrir);const ObjDialogo=screen.getByRole("dialog",{name:"Fotografía de A-01"});expect(ObjDialogo).toHaveAttribute("open");expect(screen.getByAltText("Fotografía ampliada de A-01")).toHaveAttribute("src","blob:foto-animal");await userEvent.click(screen.getByRole("button",{name:"Cerrar Fotografía de A-01"}));await waitFor(()=>expect(ObjDialogo).not.toHaveAttribute("open"));});
  it("sin fotografía conserva Agregar fotografía y no ofrece ampliación",async()=>{ObjMocks.obtenerFicha.mockResolvedValue({datos:{...ObjFicha,tieneFoto:false}});Produccion_renderizar();expect(await screen.findByText("Sin fotografía")).toBeVisible();expect(screen.getByText("Agregar fotografía")).toBeVisible();expect(screen.queryByRole("button",{name:/Ver fotografía ampliada/})).toBeNull();expect(ObjMocks.obtenerFoto).not.toHaveBeenCalled();});
  it("mantiene impresión nativa y descarga PDF",async()=>{ObjMocks.obtenerFicha.mockResolvedValue({datos:{...ObjFicha,tieneFoto:false}});const ObjImprimir=vi.spyOn(window,"print").mockImplementation(()=>undefined);Produccion_renderizar();await userEvent.click(await screen.findByRole("button",{name:"Imprimir"}));expect(ObjImprimir).toHaveBeenCalledOnce();await userEvent.click(screen.getByRole("button",{name:"Descargar PDF"}));await waitFor(()=>expect(ObjMocks.generarPdf).toHaveBeenCalledWith(expect.objectContaining({identificacion:"A-01"}),null));});
});
