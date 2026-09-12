import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ErrorApi } from "../../types/api.types";
import type { DisponibilidadAlimentacion, FormulaAlimentacion } from "../../types/alimentacion.types";
import { PaginaRegistrarAlimentacion } from "./PaginaRegistrarAlimentacion";

const ObjServicios=vi.hoisted(()=>({formulas:vi.fn(),disponibilidad:vi.fn(),registrar:vi.fn(),existencias:vi.fn(),almacenes:vi.fn(),lotes:vi.fn()}));
const ObjProducto={productoId:5,codigo:"ALI-05",nombre:"Concentrado",unidadMedida:"lb",activo:true,manejaLotes:true,habilitacionAlimentacion:{activo:true}};
const ObjFormula:FormulaAlimentacion={formulaId:1,nombre:"Crecimiento",descripcion:null,cantidadBase:"1",unidadBase:"lb",activo:true,detalles:[{detalleFormulaId:1,productoId:5,cantidad:"4",unidadMedida:"lb",activo:true,producto:ObjProducto}]};
const ObjDisponible:DisponibilidadAlimentacion={formulaId:1,disponible:true,mensaje:null,faltantes:[],ingredientes:[{productoId:5,nombre:"Concentrado",cantidad:"4",unidadMedida:"lb",disponible:"100",atendible:true}]};
const StrFaltantes="No se puede registrar la alimentación:\n- Concentrado: requerido 4 lb, disponible en una sola fuente 2 lb.\n- Maíz: requerido 6 lb, disponible en una sola fuente 0 lb.";

vi.mock("../../services/alimentacion.service",()=>({
 Alimentacion_listarProductos:async()=>({datos:[ObjProducto]}),
 Alimentacion_listarFormulas:ObjServicios.formulas,
 Alimentacion_consultarDisponibilidad:ObjServicios.disponibilidad,
 Alimentacion_registrar:ObjServicios.registrar,
 Alimentacion_buscarExistencias:ObjServicios.existencias,
 Alimentacion_buscarAlmacenes:ObjServicios.almacenes,
 Alimentacion_buscarLotesInventario:ObjServicios.lotes,
 Alimentacion_buscarDestinosAnimales:async()=>[{animalId:7,identificacion:"ARETE-007",sexo:"HEMBRA",tipoAnimal:{tipoAnimalId:1,nombre:"Bovino"},loteVigente:{loteProduccionId:2,codigo:"ENG-01",nombre:"Engorde"}}],
 Alimentacion_buscarDestinosLotes:async()=>[],
}));

beforeEach(()=>{
 vi.clearAllMocks();
 ObjServicios.formulas.mockResolvedValue({datos:[ObjFormula]});
 ObjServicios.disponibilidad.mockResolvedValue(ObjDisponible);
 ObjServicios.registrar.mockResolvedValue({datos:{alimentacionId:42}});
 ObjServicios.existencias.mockResolvedValue([{inventarioId:3,productoId:5,cantidadDisponible:"100",unidadBase:"lb",almacen:{codigo:"CENTRAL",nombre:"Central"}}]);
 ObjServicios.almacenes.mockResolvedValue([{inventarioId:3,codigo:"CENTRAL",nombre:"Central"}]);
 ObjServicios.lotes.mockResolvedValue([{loteInventarioId:8,codigoLote:"INV000008",cantidadDisponible:"100",fechaVencimiento:null,costoUnitario:"1",activo:true}]);
});

async function Alimentacion_seleccionar(){
 render(<PaginaRegistrarAlimentacion/>);
 await screen.findByRole("option",{name:"Crecimiento"});
 await userEvent.selectOptions(screen.getByLabelText("Fórmula (opcional)"),"1");
 fireEvent.change(screen.getByLabelText("Fecha y hora efectiva"),{target:{value:"2026-09-11T08:00"}});
}
async function Alimentacion_destino(){
 await userEvent.type(screen.getByRole("combobox",{name:"Animal"}),"ARETE");
 await userEvent.click(await screen.findByRole("option",{name:/ARETE-007/}));
}

it("fórmula fija: registra sin campos físicos y vuelve a consultar antes de confirmar",async()=>{
 await Alimentacion_seleccionar();
 expect(screen.queryByRole("combobox",{name:"Almacén"})).toBeNull();
 expect(screen.queryByRole("combobox",{name:"Lote de Inventario"})).toBeNull();
 expect(screen.queryByRole("button",{name:"Agregar alimento"})).toBeNull();
 expect(screen.getByLabelText("Cantidad (lb)")).toHaveAttribute("readonly");
 await screen.findByText(/Inventario disponible/);
 await Alimentacion_destino();
 const IntConsultas=ObjServicios.disponibilidad.mock.calls.length;
 await userEvent.click(screen.getByRole("button",{name:"Revisar y confirmar"}));
 const ObjDialogo=await screen.findByRole("dialog");
 expect(ObjServicios.disponibilidad.mock.calls.length).toBe(IntConsultas+1);
 await userEvent.click(within(ObjDialogo).getByRole("button",{name:"Confirmar alimentación"}));
 await screen.findByText(/42 registrada correctamente/);
 expect(ObjServicios.registrar).toHaveBeenCalledWith({formulaId:1,fechaEfectiva:"2026-09-11T08:00:00.000-06:00",destino:{tipo:"ANIMAL",animalId:7},observaciones:null,detalles:[{productoId:5,cantidad:"4"}]});
 expect(ObjServicios.existencias).not.toHaveBeenCalled();
});

it("muestra todos los faltantes y permite reabastecer y reintentar la misma fórmula",async()=>{
 ObjServicios.disponibilidad.mockResolvedValue({...ObjDisponible,disponible:false,mensaje:StrFaltantes});
 await Alimentacion_seleccionar();
 expect(await screen.findByRole("alert")).toHaveTextContent("Concentrado");
 expect(screen.getByRole("alert")).toHaveTextContent("Maíz");
 await Alimentacion_destino();
 await userEvent.click(screen.getByRole("button",{name:"Revisar y confirmar"}));
 await waitFor(()=>expect(screen.getByRole("button",{name:"Revisar y confirmar"})).toBeEnabled());
 expect(screen.queryByRole("dialog")).toBeNull();
 expect(ObjServicios.registrar).not.toHaveBeenCalled();
 ObjServicios.disponibilidad.mockResolvedValue(ObjDisponible);
 await userEvent.click(screen.getByRole("button",{name:"Comprobar disponibilidad"}));
 await screen.findByText(/Inventario disponible/);
 expect(screen.getByLabelText("Fórmula (opcional)")).toHaveValue("1");
 expect(screen.getByLabelText("Cantidad (lb)")).toHaveValue("4");
});

it("conserva formulario y mensaje completo si el backend rechaza el guardado",async()=>{
 ObjServicios.registrar.mockRejectedValue(new ErrorApi(409,"ALIMENTACION_INVENTARIO_INSUFICIENTE",StrFaltantes));
 await Alimentacion_seleccionar();
 await Alimentacion_destino();
 await userEvent.click(screen.getByRole("button",{name:"Revisar y confirmar"}));
 await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button",{name:"Confirmar alimentación"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Maíz");
 expect(screen.getByLabelText("Fórmula (opcional)")).toHaveValue("1");
});

it("consumo directo conserva selección manual y cantidades editables",async()=>{
 await Alimentacion_seleccionar();
 await userEvent.selectOptions(screen.getByLabelText("Fórmula (opcional)"),"");
 await waitFor(()=>expect(ObjServicios.existencias).toHaveBeenCalledWith(5));
 expect(screen.getByLabelText("Cantidad (lb)")).not.toHaveAttribute("readonly");
 await userEvent.type(screen.getByRole("combobox",{name:"Almacén"}),"Central");
 await userEvent.click(await screen.findByRole("option",{name:/CENTRAL/}));
 await userEvent.type(screen.getByRole("combobox",{name:"Lote de Inventario"}),"INV");
 await userEvent.click(await screen.findByRole("option",{name:/INV000008/}));
 await Alimentacion_destino();
 await userEvent.click(screen.getByRole("button",{name:"Revisar y confirmar"}));
 await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button",{name:"Confirmar alimentación"}));
 await waitFor(()=>expect(ObjServicios.registrar).toHaveBeenCalled());
 expect(ObjServicios.registrar.mock.calls[0]![0].detalles).toEqual([{productoId:5,inventarioId:3,loteInventarioId:8,cantidad:"4"}]);
});

it("descarta una respuesta de disponibilidad de una fecha anterior",async()=>{
 let Alimentacion_resolver!:(Obj:DisponibilidadAlimentacion)=>void;
 ObjServicios.disponibilidad.mockImplementationOnce(()=>new Promise<DisponibilidadAlimentacion>(ObjResolver=>{Alimentacion_resolver=ObjResolver;}));
 await Alimentacion_seleccionar();
 await waitFor(()=>expect(ObjServicios.disponibilidad).toHaveBeenCalledTimes(1));
 fireEvent.change(screen.getByLabelText("Fecha y hora efectiva"),{target:{value:"2026-09-12T08:00"}});
 await screen.findByText(/Inventario disponible/);
 await act(async()=>Alimentacion_resolver({...ObjDisponible,disponible:false,mensaje:StrFaltantes}));
 expect(screen.queryByRole("alert")).toBeNull();
});
