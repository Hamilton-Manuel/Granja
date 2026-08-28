import type { ErrorApi } from "./api.types";
export type DecimalAlimentacion = string;
export interface RespuestaDato<T> {
  datos: T;
}
export interface RespuestaLista<T> {
  datos: T[];
  paginacion: { pagina: number; limite: number; total: number };
}
export interface ProductoAlimentacion {
  productoId: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  manejaLotes: boolean;
  activo: boolean;
  habilitacionAlimentacion: { activo: boolean } | null;
}
export interface FormulaDetalle {
  detalleFormulaId: number;
  productoId: number;
  cantidad: DecimalAlimentacion;
  unidadMedida: string;
  activo: boolean;
  producto: ProductoAlimentacion;
}
export interface FormulaAlimentacion {
  formulaId: number;
  nombre: string;
  descripcion: string | null;
  cantidadBase: DecimalAlimentacion;
  unidadBase: string;
  activo: boolean;
  detalles: FormulaDetalle[];
}
export interface AlmacenResumen {
  inventarioId: number;
  codigo: string;
  nombre: string;
}
export interface LoteInventarioResumen {
  loteInventarioId: number;
  codigoLote: string;
  fechaVencimiento: string | null;
  costoUnitario: DecimalAlimentacion | null;
}
export interface DetalleAlimentacion {
  detalleAlimentacionId: number;
  productoId: number;
  cantidadConsumida: DecimalAlimentacion;
  unidadMedida: string;
  producto: ProductoAlimentacion;
  existencia: { almacen: AlmacenResumen } | null;
  existenciaLote: {
    lote: LoteInventarioResumen;
    existencia: { almacen: AlmacenResumen };
  } | null;
  inventarioTransacciones: Array<{ costoUnitario: DecimalAlimentacion | null }>;
}
export interface RegistroAlimentacion {
  alimentacionId: number;
  fechaAlimentacion: string;
  estado: "CONFIRMADA" | "REVERTIDA";
  observaciones: string | null;
  animal: { animalId: number; identificacion: string } | null;
  lote: { loteProduccionId: number; codigo: string; nombre: string } | null;
  formula: { formulaId: number; nombre: string } | null;
  usuario: { usuarioId: number; nombreCompleto: string };
  detalles: DetalleAlimentacion[];
}
export interface ConsultaAlimentacion {
  pagina: number;
  limite: number;
  busqueda?: string;
  estado?: "CONFIRMADA" | "REVERTIDA";
  destino?: "ANIMAL" | "LOTE";
  formulaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}
export interface DatosFormula {
  nombre: string;
  descripcion?: string | null;
  cantidadBase: DecimalAlimentacion;
  unidadBase: string;
  detalles: Array<{ productoId: number; cantidad: DecimalAlimentacion }>;
}
export interface DiagnosticoAlimentacion {
  fechaDiagnostico: string;
  consistente: boolean;
  diferencias: {
    detallesSinMovimiento: number;
    movimientosHuerfanos: number;
    registrosSinEvento: number;
  };
  usuarioId: number;
}
export interface DestinoAnimalAlimentacion { animalId:number; identificacion:string; sexo:string; tipoAnimal:{tipoAnimalId:number;nombre:string}; loteVigente:{loteProduccionId:number;codigo:string;nombre:string}; }
export interface DestinoLoteAlimentacion { loteProduccionId:number; codigo:string; nombre:string; tipoAnimal:{tipoAnimalId:number;nombre:string}; cantidadAnimalesVigentes:number; }
export interface AlmacenAlimentacion { inventarioId:number; codigo:string; nombre:string; }
export interface ExistenciaAlimentacion { inventarioId:number; productoId:number; cantidadDisponible:DecimalAlimentacion; unidadBase:string; almacen:{codigo:string;nombre:string}; }
export interface LoteFuenteAlimentacion { loteInventarioId:number; codigoLote:string; cantidadDisponible:DecimalAlimentacion; fechaVencimiento:string|null; costoUnitario:DecimalAlimentacion|null; activo:boolean; }
export interface DetalleRegistroAlimentacion { productoId:number; inventarioId:number; loteInventarioId:number; cantidad:DecimalAlimentacion; }
export interface DatosRegistroAlimentacion { formulaId?:number|null; fechaEfectiva:string; destino:{tipo:"ANIMAL";animalId:number}|{tipo:"LOTE";loteProduccionId:number}; observaciones?:string|null; detalles:DetalleRegistroAlimentacion[]; }
export type ErrorAlimentacion = ErrorApi;
