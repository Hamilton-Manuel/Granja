export function Api_validarOrigen(StrOrigen: string, BoolProduccion: boolean): string {
  const StrValor = StrOrigen.trim();
  if (!StrValor && !BoolProduccion) return "";
  let ObjUrl: URL;
  try { ObjUrl = new URL(StrValor); } catch { throw new Error("VITE_API_ORIGIN debe ser un origen válido."); }
  if (ObjUrl.username || ObjUrl.password || ObjUrl.search || ObjUrl.hash || ObjUrl.pathname !== "/" ||
      !["http:", "https:"].includes(ObjUrl.protocol) ||
      (BoolProduccion && (ObjUrl.protocol !== "https:" || /^(localhost|127\..*|\[::1\])$/.test(ObjUrl.hostname)))) {
    throw new Error("VITE_API_ORIGIN debe ser un origen HTTPS público, sin ruta ni credenciales.");
  }
  return ObjUrl.origin;
}

export function Api_resolverUrl(StrRuta: string): string {
  if (!StrRuta.startsWith("/api/") || StrRuta.includes("\\")) throw new Error("Ruta API inválida.");
  const StrOrigen = Api_validarOrigen(import.meta.env.VITE_API_ORIGIN ?? "", import.meta.env.PROD);
  const ObjUrl = new URL(StrRuta, StrOrigen || "http://localhost");
  if (!ObjUrl.pathname.startsWith("/api/")) throw new Error("Ruta API inválida.");
  return `${StrOrigen}${StrRuta}`;
}
