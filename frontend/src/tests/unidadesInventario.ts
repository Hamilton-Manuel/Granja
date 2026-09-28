import type { UnidadInventario } from "../types/inventario.types";

export const ArrUnidadesVolumenConfirmadasPrueba: UnidadInventario[] = [
  { unidadMedidaId: 10, codigo: "gal", nombre: "Galón", dimension: "VOLUMEN", factorReferencia: "3785.411784", activo: true },
  { unidadMedidaId: 11, codigo: "caneca", nombre: "Caneca", dimension: "VOLUMEN", factorReferencia: "18927.05892", activo: true },
];

export const ArrUnidadesPrueba: UnidadInventario[] = [
  { codigo: "kg", nombre: "Kilogramo", dimension: "PESO", factorReferencia: "1000" },
  { codigo: "g", nombre: "Gramo", dimension: "PESO", factorReferencia: "1" },
  { codigo: "lb", nombre: "Libra", dimension: "PESO", factorReferencia: "453.59237" },
  { codigo: "oz", nombre: "Onza", dimension: "PESO", factorReferencia: "28.349523125" },
  { codigo: "qq", nombre: "Quintal", dimension: "PESO", factorReferencia: "45359.237" },
  { codigo: "t", nombre: "Tonelada", dimension: "PESO", factorReferencia: "1000000" },
  { codigo: "L", nombre: "Litro", dimension: "VOLUMEN", factorReferencia: "1000" },
  { codigo: "mL", nombre: "Mililitro", dimension: "VOLUMEN", factorReferencia: "1" },
  { codigo: "unidad", nombre: "Unidad", dimension: "UNIDADES", factorReferencia: "1" },
].map((Obj, IntIndice) => ({ ...Obj, dimension: Obj.dimension as UnidadInventario["dimension"], unidadMedidaId: IntIndice + 1, activo: true }));
