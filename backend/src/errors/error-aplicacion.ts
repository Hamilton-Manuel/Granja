export class ErrorAplicacion extends Error {
  public readonly IntEstadoHttp: number;
  public readonly StrCodigo: string;

  public constructor(
    IntEstadoHttp: number,
    StrCodigo: string,
    StrMensajePublico: string,
  ) {
    super(StrMensajePublico);
    this.name = "ErrorAplicacion";
    this.IntEstadoHttp = IntEstadoHttp;
    this.StrCodigo = StrCodigo;
  }
}
