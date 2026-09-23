import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProveedorSesion } from "../../auth/ProveedorSesion";
import { RutasAplicacion } from "../../routes/RutasAplicacion";
import { ArrPermisosConcentrados } from "../../components/alimentacion/ConcentradosCompartidos";
import type { Concentrado, RecetaConcentrado, PreviaConcentrado, ElaboracionConcentrado, DependenciasConcentrado } from "../../types/concentrados.types";

const ObjProducto = { productoId: 2, codigo: "MP-2", nombre: "Maíz", unidadMedida: "lb", activo: true };
const ObjConcentrado: Concentrado = { concentradoId: 1, productoId: 1, activo: true, producto: { codigo: "CT-1", nombre: "Crecimiento", unidadMedida: "lb", activo: true } };
const ObjReceta: RecetaConcentrado = { recetaId: 3, concentradoId: 1, productoId: 1, nombre: "Receta crecimiento", version: 2, activo: true, cantidadBase: "100.000000", unidadBase: "lb", descripcion: "Base", detalles: [{ recetaDetalleId: 4, productoId: 2, cantidad: "100.000001", unidadMedida: "lb", activo: true, producto: ObjProducto }] };
const ObjAlmacen = { inventarioId: 7, codigo: "A-7", nombre: "Central" };
const ObjPrevia: PreviaConcentrado = { disponible: true, reservaExistencias: false, huellaPrevisualizacion: "a".repeat(64), receta: { recetaId: 3, version: 2, nombre: "Receta crecimiento" }, productoTerminado: { productoId: 1, codigo: "CT-1", nombre: "Crecimiento", unidadBase: "lb" }, destino: ObjAlmacen,
  fechaEfectiva: "2026-09-22T09:30:00.000-06:00", cantidadTeorica: "500", cantidadReal: "490", unidadCaptura: "lb", cantidadTeoricaBase: "500.000000", cantidadRealBase: "490.000000",
  rendimiento: { diferencia: "-10", porcentaje: "98", motivo: "Merma documentada" }, balanceMasa: { unidad: "g", ingredientesRequeridos: "226796.185", ingredientesDisponiblesAsignados: "226796.185", salidaTeorica: "226796.185", salidaReal: "222260.2613", diferenciaEntradaSalida: "4535.9237", residualCuantizacionSalida: "0" },
  ingredientes: [{ productoId: 2, codigo: "MP-2", nombre: "Maíz", unidadBase: "lb", cantidadRequerida: "500.000005", cantidadDisponible: "600.000000", cantidadFaltante: "0.000000", fuentes: [{ existenciaLoteId: 11, inventarioId: 7, loteInventarioId: 9, codigoLote: "INV-9", existenciaActual: "600.000000", cantidad: "500.000005", costoUnitario: "2.123456789012345678", importe: "1061.728405123456784061728390", fechaVencimiento: null }] }], faltantes: [], costoDisponible: "1061.728405123456784061728390", costoEstimado: { total: "1061.728405123456784061728390", unitario: "2.166792663517258743", unidad: "lb", residualValoracion: "-0.000000000000000008271610" } };
const ObjElaboracion: ElaboracionConcentrado = { elaboracionId: 42, recetaId: 3, productoId: 1, fechaEfectiva: ObjPrevia.fechaEfectiva, codigoProductoSnapshot: "CT-1", nombreProductoSnapshot: "Crecimiento histórico", nombreRecetaSnapshot: "Receta histórica", versionReceta: 2, estado: "CONFIRMADA", cantidadRealBase: "490.000000", unidadBaseSnapshot: "lb", costoTotal: ObjPrevia.costoEstimado!.total, costoUnitario: ObjPrevia.costoEstimado!.unitario, residualValoracion: ObjPrevia.costoEstimado!.residualValoracion,
  cantidadTeorica: "500.000000", cantidadReal: "490.000000", unidadCaptura: "lb", cantidadTeoricaBase: "500.000000", usuarioId: 1, usuario: { nombreCompleto: "Responsable de prueba" }, loteInventarioId: 20, transaccionIngresoId: 31, motivoDiferencia: "Merma documentada", observaciones: "Turno de mañana", fechaReversion: null, motivoReversion: null, lote: { codigoLote: "INV-20", fechaVencimiento: null }, almacenDestino: ObjAlmacen,
  detalles: [{ elaboracionDetalleId: 1, productoId: 2, codigoProductoSnapshot: "MP-2", nombreProductoSnapshot: "Maíz histórico", cantidadConsumida: "500.000005", unidadBaseSnapshot: "lb", fuentes: [{ elaboracionFuenteId: 1, existenciaLoteId: 11, transaccionConsumoId: 30, cantidadConsumida: "500.000005", costoUnitarioHistorico: "2.123456789012345678", costoTotal: ObjPrevia.costoEstimado!.total, lote: { loteInventarioId: 9, codigoLote: "INV-9" }, almacen: ObjAlmacen }] }] };
const ObjDependencias: DependenciasConcentrado = { elaboracionId: 42, reversible: true, estado: "CONFIRMADA", cantidadRequerida: "490", unidad: "lb", bloqueos: [], dependencias: [] };
const StrBase = "/api/alimentacion/concentrados";
let ArrPermisos: string[], ObjVista: PreviaConcentrado, ObjDiagnostico: DependenciasConcentrado;
let ArrSolicitudes: { ruta: string; metodo: string; cuerpo: Record<string, unknown> }[];
let StrErrorConfirmacion: string | null, BoolFalloRed: boolean, BoolBloqueoReversion: boolean;
let Alimentacion_resolverConfirmacion: (() => void) | undefined;
let BoolDemorarConfirmacion: boolean;
function Alimentacion_json(Obj: unknown, IntEstado = 200) { return new Response(JSON.stringify(Obj), { status: IntEstado, headers: { "Content-Type": "application/json" } }); }
function Alimentacion_lista<T>(Arr: T[]) { return { datos: Arr, paginacion: { pagina: 1, limite: 20, total: Arr.length } }; }
beforeEach(() => {
  ArrPermisos = [...ArrPermisosConcentrados]; ObjVista = structuredClone(ObjPrevia); ObjDiagnostico = structuredClone(ObjDependencias); ArrSolicitudes = [];
  StrErrorConfirmacion = null; BoolFalloRed = false; BoolDemorarConfirmacion = false; BoolBloqueoReversion = false;
  Alimentacion_resolverConfirmacion = undefined;
  vi.stubGlobal("fetch", vi.fn(async (StrUrl: string, ObjOpciones?: RequestInit) => {
    const ObjUrl = new URL(StrUrl, "http://localhost"); const StrRuta = ObjUrl.pathname; const StrMetodo = ObjOpciones?.method ?? "GET";
    const ObjCuerpo = ObjOpciones?.body ? JSON.parse(String(ObjOpciones.body)) as Record<string, unknown> : {};
    ArrSolicitudes.push({ ruta: StrRuta, metodo: StrMetodo, cuerpo: ObjCuerpo });
    if (StrRuta === "/api/usuarios/sesion") return Alimentacion_json({ datos: { usuario: { usuarioId: 1, nombreCompleto: "Responsable de prueba", nombreUsuario: "prueba", correo: "prueba@example.test", estado: "ACTIVO", rol: { rolId: 1, nombre: "OPERADOR" }, permisos: ArrPermisos } } });
    if (StrRuta === `${StrBase}/catalogos`) return Alimentacion_json({ datos: { unidades: [{ codigo: "lb", factorReferencia: "453.59237" }, { codigo: "kg", factorReferencia: "1000" }, { codigo: "qq", factorReferencia: "45359.237" }, { codigo: "t", factorReferencia: "1000000" }], almacenes: [ObjAlmacen] } });
    if (StrRuta === `${StrBase}/productos`) return Alimentacion_json({ datos: [ObjUrl.searchParams.get("busqueda")?.includes("Soya") ? { ...ObjProducto, productoId: 5, codigo: "MP-5", nombre: "Soya" } : ObjProducto] });
    if (StrRuta === StrBase) return Alimentacion_json(StrMetodo === "GET" ? Alimentacion_lista([ObjConcentrado]) : { datos: ObjConcentrado });
    if (StrRuta === `${StrBase}/1`) return Alimentacion_json({ datos: ObjConcentrado });
    if (StrRuta === `${StrBase}/1/estado`) return Alimentacion_json({ datos: { ...ObjConcentrado, activo: false } });
    if (StrRuta === `${StrBase}/recetas`) return Alimentacion_json(StrMetodo === "GET" ? Alimentacion_lista([ObjReceta]) : { datos: ObjReceta });
    if (StrRuta === `${StrBase}/recetas/3` || StrRuta === `${StrBase}/recetas/3/estado`) return Alimentacion_json({ datos: ObjReceta });
    if (StrRuta === `${StrBase}/elaboraciones/previsualizar`) return Alimentacion_json({ datos: ObjVista });
    if (StrRuta === `${StrBase}/elaboraciones` && StrMetodo === "GET") return Alimentacion_json(Alimentacion_lista([ObjElaboracion]));
    if (StrRuta === `${StrBase}/elaboraciones` && StrMetodo === "POST") {
      if (BoolFalloRed) throw new TypeError("Red interrumpida");
      if (StrErrorConfirmacion) return Alimentacion_json({ error: { codigo: StrErrorConfirmacion, mensaje: "Conflicto desde backend" } }, 409);
      if (BoolDemorarConfirmacion) await new Promise<void>(ObjResolver => { Alimentacion_resolverConfirmacion = ObjResolver; });
      return Alimentacion_json({ datos: ObjElaboracion, reutilizada: false }, 201);
    }
    if (StrRuta === `${StrBase}/elaboraciones/42`) return Alimentacion_json({ datos: ObjElaboracion });
    if (StrRuta === `${StrBase}/elaboraciones/42/dependencias`) return Alimentacion_json({ datos: ObjDiagnostico });
    if (StrRuta === `${StrBase}/elaboraciones/42/revertir`) {
      if (BoolBloqueoReversion) return Alimentacion_json({ error: { codigo: "ELABORACION_REVERSION_BLOQUEADA", mensaje: "Aparecieron dependencias pendientes." } }, 409);
      return Alimentacion_json({ datos: { ...ObjElaboracion, estado: "REVERTIDA", motivoReversion: ObjCuerpo.motivo }, reutilizada: false });
    }
    throw new Error(`Solicitud inesperada ${StrMetodo} ${StrRuta}`);
  }));
});
afterEach(() => vi.unstubAllGlobals());
function Alimentacion_renderizar(StrRuta = "/alimentacion/concentrados") { render(<MemoryRouter initialEntries={[StrRuta]}><ProveedorSesion><RutasAplicacion /></ProveedorSesion></MemoryRouter>); }
async function Alimentacion_previa() {
  Alimentacion_renderizar("/alimentacion/concentrados/elaborar?recetaId=3");
  await screen.findByDisplayValue("Receta crecimiento · versión 2");
  fireEvent.change(screen.getByLabelText("Fecha y hora efectiva"), { target: { value: "2026-09-22T09:30" } });
  fireEvent.change(screen.getByLabelText("Cantidad a elaborar"), { target: { value: "500" } });
  fireEvent.change(screen.getByLabelText("Cantidad obtenida"), { target: { value: "490" } });
  await userEvent.selectOptions(screen.getByLabelText("Almacén destino"), "7");
  fireEvent.change(screen.getByLabelText("Justificación de diferencia"), { target: { value: "Merma documentada" } });
  await userEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));
  await screen.findByRole("region", { name: "Vista previa de elaboración" });
}
async function Alimentacion_confirmar() {
  await userEvent.click(screen.getByRole("button", { name: /Revisar y confirmar elaboración|Reintentar confirmación/ }));
  const ObjModal = await screen.findByRole("dialog", { name: "Confirmar elaboración" });
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Confirmar elaboración" }));
}
function Alimentacion_confirmaciones() { return ArrSolicitudes.filter(Obj => Obj.ruta === `${StrBase}/elaboraciones` && Obj.metodo === "POST"); }

async function Alimentacion_formularioEntero() {
  Alimentacion_renderizar("/alimentacion/concentrados/elaborar");
  await userEvent.type(await screen.findByRole("combobox", { name: "Receta" }), "crecimiento");
  await userEvent.click(await screen.findByRole("option", { name: "Receta crecimiento · versión 2" }));
  fireEvent.change(screen.getByLabelText("Fecha y hora efectiva"), { target: { value: "2026-09-22T09:30" } });
  fireEvent.change(screen.getByLabelText("Cantidad a elaborar"), { target: { value: "395" } });
  fireEvent.change(screen.getByLabelText("Cantidad obtenida"), { target: { value: "395" } });
  await userEvent.selectOptions(screen.getByLabelText("Almacén destino"), "7");
}
it.each(["395", "395.5", "395.25", "395.123456", " 395 "])("Elaboración acepta %s sin vencimiento ni justificación cuando las cantidades coinciden", async StrCantidad => {
  await Alimentacion_formularioEntero();
  fireEvent.change(screen.getByLabelText("Cantidad a elaborar"), { target: { value: StrCantidad } });
  fireEvent.change(screen.getByLabelText("Cantidad obtenida"), { target: { value: StrCantidad } });
  await userEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));
  await screen.findByRole("region", { name: "Vista previa de elaboración" });
  const ObjEntrada = ArrSolicitudes.find(Obj => Obj.ruta.endsWith("previsualizar"))!.cuerpo;
  expect(ObjEntrada).toMatchObject({ cantidadTeorica: StrCantidad.trim(), cantidadReal: StrCantidad.trim(), unidadCaptura: "lb", inventarioDestinoId: 7 });
  expect(ObjEntrada).not.toHaveProperty("fechaVencimiento");
  expect(ObjEntrada).not.toHaveProperty("motivoDiferencia");
});
it("Elaboración considera iguales 395 y 395.000000 sin exigir justificación", async () => {
  await Alimentacion_formularioEntero();
  fireEvent.change(screen.getByLabelText("Cantidad obtenida"), { target: { value: "395.000000" } });
  await userEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));
  await screen.findByRole("region", { name: "Vista previa de elaboración" });
  expect(ArrSolicitudes.find(Obj => Obj.ruta.endsWith("previsualizar"))!.cuerpo).not.toHaveProperty("motivoDiferencia");
});
it.each([
  ["Cantidad a elaborar", "0", "Cantidad a elaborar: ingrese"],
  ["Cantidad obtenida", "-1", "Cantidad obtenida: ingrese"],
  ["Cantidad obtenida", "395.1234567", "Cantidad obtenida: ingrese"],
  ["Cantidad obtenida", "394", "Justifique la diferencia"],
  ["Fecha y hora efectiva", "", "fecha y hora efectiva válida"],
  ["Unidad de elaboración", "", "unidad de elaboración válida"],
  ["Almacén destino", "", "almacén destino válido"],
  ["Vencimiento (si aplica)", "2026-09-21", "vencimiento no puede ser anterior"],
])("Elaboración identifica el campo inválido %s (%s)", async (StrCampo, StrValor, StrMensaje) => {
  await Alimentacion_formularioEntero();
  fireEvent.change(screen.getByLabelText(StrCampo), { target: { value: StrValor } });
  // Verifica también la validación de la aplicación, independientemente de la validación HTML nativa.
  fireEvent.submit(screen.getByRole("button", { name: "Generar vista previa" }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(StrMensaje);
  expect(ArrSolicitudes.some(Obj => Obj.ruta.endsWith("previsualizar"))).toBe(false);
});
it("Elaboración distingue texto escrito de una receta seleccionada", async () => {
  await Alimentacion_formularioEntero();
  fireEvent.change(screen.getByRole("combobox", { name: "Receta" }), { target: { value: "Otra receta" } });
  await userEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Seleccione una receta de la lista de resultados");
  expect(ArrSolicitudes.some(Obj => Obj.ruta.endsWith("previsualizar"))).toBe(false);
});

it("navega a Concentrados sin exigir permisos de alimentación operativa", async () => {
  Alimentacion_renderizar();
  expect(await screen.findByRole("heading", { name: "Concentrados" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Alimentación" })).toHaveAttribute("href", "/alimentacion/concentrados");
  await userEvent.click(within(screen.getByRole("navigation", { name: "Secciones de Concentrados" })).getByRole("link", { name: "Recetas" }));
  expect(await screen.findByRole("heading", { name: "Recetas de concentrados" })).toBeInTheDocument();
});
it("consulta sin permisos de gestión oculta clasificación, edición y elaboración", async () => {
  ArrPermisos = ["ALIMENTACION_CONCENTRADOS_CONSULTAR"];
  Alimentacion_renderizar(); await screen.findByText("Crecimiento");
  expect(screen.queryByRole("button", { name: "Clasificar producto existente" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Elaborar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Inactivar" })).toBeNull();
});
it("clasifica un producto existente sin crear otro y permite cambiar su estado", async () => {
  Alimentacion_renderizar();
  await userEvent.click(await screen.findByRole("button", { name: "Clasificar producto existente" }));
  const ObjModal = await screen.findByRole("dialog", { name: "Clasificar producto como concentrado" });
  expect(within(ObjModal).queryByRole("link", { name: "Administrar productos en Inventario" })).toBeNull();
  await userEvent.type(within(ObjModal).getByRole("combobox", { name: "Producto existente" }), "Maíz");
  await userEvent.click(await within(ObjModal).findByRole("option", { name: /MP-2/ }));
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Clasificar concentrado" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Clasificar producto como concentrado" })).toBeNull());
  expect(ArrSolicitudes.find(Obj => Obj.ruta === StrBase && Obj.metodo === "POST")?.cuerpo).toEqual({ productoId: 2 });
  await userEvent.click(await screen.findByRole("button", { name: "Inactivar" }));
  await userEvent.click(within(await screen.findByRole("dialog", { name: "Inactivar concentrado" })).getByRole("button", { name: "Confirmar estado" }));
  await waitFor(() => expect(ArrSolicitudes.some(Obj => Obj.ruta === `${StrBase}/1/estado` && Obj.cuerpo.activo === false)).toBe(true));
});
it("el acceso de solo historial abre Concentrados sin consultar recetas ni catálogo", async () => {
  ArrPermisos = ["ALIMENTACION_ELABORACIONES_CONSULTAR"];
  Alimentacion_renderizar();
  expect(await screen.findByRole("heading", { name: "Historial de elaboraciones" })).toBeInTheDocument();
  await screen.findByRole("link", { name: "Ver detalle #42" });
  expect(ArrSolicitudes.some(Obj => Obj.ruta === StrBase || Obj.ruta.endsWith("/catalogos") || Obj.ruta.endsWith("/recetas"))).toBe(false);
});
it("protege rutas de elaboración sin permiso y no consulta el backend operativo", async () => {
  ArrPermisos = ["ALIMENTACION_CONCENTRADOS_CONSULTAR"];
  Alimentacion_renderizar("/alimentacion/concentrados/elaborar");
  expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
  expect(ArrSolicitudes.some(Obj => Obj.ruta.endsWith("previsualizar"))).toBe(false);
});
it("crea receta con múltiples ingredientes y cantidades string sin movimientos", async () => {
  Alimentacion_renderizar("/alimentacion/concentrados/recetas?concentradoId=1");
  await userEvent.click(await screen.findByRole("button", { name: "Nueva receta" }));
  const ObjModal = await screen.findByRole("dialog", { name: "Nueva receta" });
  expect(within(ObjModal).getByText(/NO modifica inventario/)).toBeInTheDocument();
  fireEvent.change(within(ObjModal).getByLabelText("Nombre de receta"), { target: { value: "Nueva mezcla" } });
  expect(within(ObjModal).queryByLabelText("Rendimiento base")).toBeNull();
  expect(within(ObjModal).getByLabelText("Unidad del total")).toHaveValue("lb");
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Agregar ingrediente" }));
  await userEvent.type(within(ObjModal).getByRole("combobox", { name: "Producto ingrediente 1" }), "Maíz");
  await userEvent.click(await within(ObjModal).findByRole("option", { name: /MP-2/ }));
  fireEvent.change(within(ObjModal).getByLabelText("Cantidad ingrediente 1"), { target: { value: "99.999999" } });
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Agregar ingrediente" }));
  expect(within(ObjModal).getByLabelText("Cantidad ingrediente 2")).toBeInTheDocument();
  await userEvent.type(within(ObjModal).getByRole("combobox", { name: "Producto ingrediente 2" }), "Soya");
  await userEvent.click(await within(ObjModal).findByRole("option", { name: /MP-5/ }));
  fireEvent.change(within(ObjModal).getByLabelText("Cantidad ingrediente 2"), { target: { value: "5.000002" } });
  expect(within(ObjModal).getByText("Total de la receta: 105.000001 lb")).toBeInTheDocument();
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Guardar receta" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nueva receta" })).toBeNull());
  const ArrMutaciones = ArrSolicitudes.filter(Obj => Obj.metodo !== "GET");
  expect(ArrMutaciones).toEqual([{ ruta: `${StrBase}/recetas`, metodo: "POST", cuerpo: { concentradoId: 1, nombre: "Nueva mezcla", descripcion: "", cantidadBase: "105.000001", unidadBase: "lb", detalles: [{ productoId: 2, cantidad: "99.999999", unidadMedida: "lb" }, { productoId: 5, cantidad: "5.000002", unidadMedida: "lb" }] } }]);
});
it("edita receta enviando su versión esperada y cambia estado con esa versión", async () => {
  Alimentacion_renderizar("/alimentacion/concentrados/recetas");
  await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
  const ObjModal = await screen.findByRole("dialog", { name: "Editar receta" });
  fireEvent.change(within(ObjModal).getByLabelText("Cantidad ingrediente 1"), { target: { value: "90.123456" } });
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Guardar receta" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar receta" })).toBeNull());
  expect(ArrSolicitudes.find(Obj => Obj.metodo === "PATCH")?.cuerpo).toMatchObject({ versionEsperada: 2, cantidadBase: "90.123456", detalles: [{ productoId: 2, cantidad: "90.123456", unidadMedida: "lb" }] });
  await userEvent.click(screen.getByRole("button", { name: "Inactivar" }));
  await userEvent.click(within(await screen.findByRole("dialog", { name: "Inactivar receta" })).getByRole("button", { name: "Confirmar estado" }));
  await waitFor(() => expect(ArrSolicitudes.some(Obj => Obj.ruta.endsWith("/recetas/3/estado") && Obj.cuerpo.versionEsperada === 2 && Obj.cuerpo.activo === false)).toBe(true));
});
it("presenta cantidades, reparto y costos exactos recibidos y no confirma al previsualizar", async () => {
  await Alimentacion_previa();
  expect(screen.getByText(/Costo estimado total: Q1061.72840512345678406172839/)).toBeInTheDocument();
  expect(screen.getByText(/Lote INV-9/)).toBeInTheDocument();
  expect(screen.getByText(/500.000005 lb · Existencia: 600 lb/)).toBeInTheDocument();
  expect(screen.getByText(/98 %/)).toBeInTheDocument();
  expect(Alimentacion_confirmaciones()).toHaveLength(0);
  expect(ArrSolicitudes.find(Obj => Obj.ruta.endsWith("previsualizar"))?.cuerpo).toEqual({ recetaId: 3, versionReceta: 2, fechaEfectiva: ObjPrevia.fechaEfectiva, cantidadTeorica: "500", cantidadReal: "490", unidadCaptura: "lb", inventarioDestinoId: 7, motivoDiferencia: "Merma documentada" });
});
it("presenta todos los faltantes e impide confirmar una elaboración incompleta", async () => {
  ObjVista.disponible = false; ObjVista.costoEstimado = null;
  ObjVista.faltantes = [{ productoId: 2, nombre: "Maíz", cantidadFaltante: "25.000001", unidadBase: "lb" }, { productoId: 5, nombre: "Soya", cantidadFaltante: "4", unidadBase: "kg" }];
  await Alimentacion_previa();
  expect(screen.getByRole("alert")).toHaveTextContent("Maíz: faltan 25.000001 lb");
  expect(screen.getByRole("alert")).toHaveTextContent("Soya: faltan 4 kg");
  expect(screen.queryByRole("button", { name: "Revisar y confirmar elaboración" })).toBeNull();
});
it("invalida la vista previa al cambiar cantidades", async () => {
  await Alimentacion_previa();
  fireEvent.change(screen.getByLabelText("Cantidad obtenida"), { target: { value: "480" } });
  expect(screen.queryByRole("region", { name: "Vista previa de elaboración" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Revisar y confirmar elaboración" })).toBeNull();
});
it("confirma con huella e idempotencia, evita doble clic y presenta resultado", async () => {
  await Alimentacion_previa(); BoolDemorarConfirmacion = true;
  await Alimentacion_confirmar();
  const ObjBoton = screen.getByRole("button", { name: "Confirmando…" });
  expect(ObjBoton).toBeDisabled(); fireEvent.click(ObjBoton);
  expect(Alimentacion_confirmaciones()).toHaveLength(1);
  const ObjCuerpo = Alimentacion_confirmaciones()[0].cuerpo;
  expect(ObjCuerpo.huellaPrevisualizacion).toBe(ObjPrevia.huellaPrevisualizacion);
  expect(ObjCuerpo.claveIdempotencia).toMatch(/^[a-f0-9-]{36}$/);
  expect(ObjCuerpo).not.toHaveProperty("costoTotal"); expect(ObjCuerpo).not.toHaveProperty("fuentes");
  await act(async () => Alimentacion_resolverConfirmacion?.());
  expect(await screen.findByRole("heading", { name: "Elaboración registrada" })).toBeInTheDocument();
  expect(screen.getByText("Lote generado: INV-20")).toBeInTheDocument();
  expect(screen.getByText(/Almacén destino: A-7 · Central/)).toBeInTheDocument();
});
it("409 de vista previa obsoleta exige generar otra antes de confirmar", async () => {
  await Alimentacion_previa(); StrErrorConfirmacion = "ELABORACION_PREVIA_OBSOLETA";
  await Alimentacion_confirmar();
  expect(await screen.findByRole("alert")).toHaveTextContent("Genere una nueva vista previa");
  expect(screen.queryByRole("button", { name: "Reintentar confirmación" })).toBeNull();
  expect(screen.getByLabelText("Cantidad obtenida")).toBeEnabled();
});
it.each(["concurrencia", "red"])("reintenta tras %s con idéntica clave y contenido", async StrCaso => {
  await Alimentacion_previa();
  if (StrCaso === "concurrencia") StrErrorConfirmacion = "ELABORACION_CONFLICTO"; else BoolFalloRed = true;
  await Alimentacion_confirmar();
  const ObjError = await screen.findByRole("alert");
  expect(ObjError).not.toHaveTextContent("Genere una nueva vista previa");
  if (StrCaso === "concurrencia") expect(ObjError).toHaveTextContent("Conflicto de concurrencia");
  expect(screen.getByLabelText("Cantidad obtenida")).toBeDisabled();
  const ObjPrimera = Alimentacion_confirmaciones()[0].cuerpo;
  StrErrorConfirmacion = null; BoolFalloRed = false;
  await Alimentacion_confirmar(); await screen.findByRole("heading", { name: "Elaboración registrada" });
  expect(Alimentacion_confirmaciones()[1].cuerpo).toEqual(ObjPrimera);
});
it("historial y detalle muestran snapshots, fuentes y costos históricos", async () => {
  ArrPermisos = ["ALIMENTACION_ELABORACIONES_CONSULTAR"];
  Alimentacion_renderizar("/alimentacion/concentrados/historial");
  await userEvent.click(await screen.findByRole("link", { name: "Ver detalle #42" }));
  expect(await screen.findByText("Maíz histórico", { exact: false })).toBeInTheDocument();
  expect(screen.getByText(/Receta histórica: Receta histórica · versión 2/)).toBeInTheDocument();
  expect(screen.getByText(/Movimiento #30/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Consultar dependencias" }));
  await screen.findByText("Reversión disponible");
  expect(screen.queryByRole("button", { name: "Revertir elaboración" })).toBeNull();
});
it("muestra dependencias bloqueantes y no permite revertir ni hace cascadas", async () => {
  ObjDiagnostico = { ...ObjDependencias, reversible: false, bloqueos: [{ codigo: "PENDIENTE", mensaje: "Revierta las operaciones dependientes." }], dependencias: [{ transaccionId: 90, subtipo: "ALIMENTACION", cantidad: "-10", fecha: ObjPrevia.fechaEfectiva, codigoAlmacen: "A-7", alimentacionId: 12, elaboracionId: null, transferenciaId: null }] };
  Alimentacion_renderizar("/alimentacion/concentrados/historial/42");
  await userEvent.click(await screen.findByRole("button", { name: "Consultar dependencias" }));
  await screen.findByText("Reversión bloqueada");
  expect(screen.getByText("Alimentación #12")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Revertir elaboración" })).toBeNull();
  expect(ArrSolicitudes.filter(Obj => Obj.metodo !== "GET")).toHaveLength(0);
});
it("reversión permitida exige motivo y confirmación explícita", async () => {
  Alimentacion_renderizar("/alimentacion/concentrados/historial/42");
  await userEvent.click(await screen.findByRole("button", { name: "Consultar dependencias" }));
  await userEvent.click(await screen.findByRole("button", { name: "Revertir elaboración" }));
  const ObjModal = await screen.findByRole("dialog", { name: "Confirmar reversión integral" });
  expect(within(ObjModal).getByRole("button", { name: "Confirmar reversión" })).toBeDisabled();
  await userEvent.type(within(ObjModal).getByLabelText("Motivo de reversión"), "Error de registro");
  expect(ArrSolicitudes.filter(Obj => Obj.metodo !== "GET")).toHaveLength(0);
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Confirmar reversión" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Elaboración revertida");
  expect(ArrSolicitudes.find(Obj => Obj.ruta.endsWith("/revertir"))?.cuerpo).toEqual({ motivo: "Error de registro" });
});
it("si aparecen dependencias al revertir, recarga el diagnóstico y bloquea el reintento", async () => {
  Alimentacion_renderizar("/alimentacion/concentrados/historial/42");
  await userEvent.click(await screen.findByRole("button", { name: "Consultar dependencias" }));
  await userEvent.click(await screen.findByRole("button", { name: "Revertir elaboración" }));
  const ObjModal = await screen.findByRole("dialog");
  await userEvent.type(within(ObjModal).getByLabelText("Motivo de reversión"), "Error");
  BoolBloqueoReversion = true; ObjDiagnostico = { ...ObjDependencias, reversible: false, bloqueos: [{ codigo: "SALDO", mensaje: "El lote completo no está disponible." }] };
  await userEvent.click(within(ObjModal).getByRole("button", { name: "Confirmar reversión" }));
  await screen.findByText("Reversión bloqueada");
  expect(screen.queryByRole("button", { name: "Revertir elaboración" })).toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent("Aparecieron dependencias");
});
