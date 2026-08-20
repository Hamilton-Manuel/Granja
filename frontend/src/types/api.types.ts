export interface ErrorApiPublico {
  error: {
    codigo: string;
    mensaje: string;
  };
}

export class ErrorApi extends Error {
  public readonly IntEstadoHttp: number;
  public readonly StrCodigo: string;

  public constructor(IntEstadoHttp: number, StrCodigo: string, StrMensaje: string) {
    super(StrMensaje);
    this.name = "ErrorApi";
    this.IntEstadoHttp = IntEstadoHttp;
    this.StrCodigo = StrCodigo;
  }
}
