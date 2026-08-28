import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Produccion_limpiarNombreFoto, Produccion_procesarFoto } from "./produccion-fotos.js";

function Produccion_archivoPrueba(ObjContenido: Buffer, StrNombre = "foto.png", StrMime = "image/png"): Express.Multer.File {
  return {
    fieldname: "foto",
    originalname: StrNombre,
    encoding: "7bit",
    mimetype: StrMime,
    size: ObjContenido.length,
    buffer: ObjContenido,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as never,
  };
}

test("Produccion_procesarFoto convierte imagen real a WebP sin ampliar", async () => {
  const ObjPng = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#336699" } }).png().toBuffer();
  const ObjResultado = await Produccion_procesarFoto(Produccion_archivoPrueba(ObjPng, "..\\corral/foto.png", "application/octet-stream"));
  const ObjMetadatos = await sharp(ObjResultado.ObjContenido).metadata();
  assert.equal(ObjMetadatos.format, "webp");
  assert.equal(ObjResultado.IntAncho, 320);
  assert.equal(ObjResultado.IntAlto, 200);
  assert.equal(ObjResultado.StrNombreOriginal, "foto.png");
});

test("Produccion_procesarFoto limita el lado mayor a 1600 pixeles", async () => {
  const ObjJpeg = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "white" } }).jpeg().toBuffer();
  const ObjResultado = await Produccion_procesarFoto(Produccion_archivoPrueba(ObjJpeg, "foto.jpg", "image/jpeg"));
  assert.equal(ObjResultado.IntAncho, 1600);
  assert.equal(ObjResultado.IntAlto, 800);
});

test("Produccion_procesarFoto rechaza SVG y contenido corrupto", async () => {
  for (const ObjContenido of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from("no-es-imagen")]) {
    await assert.rejects(
      Produccion_procesarFoto(Produccion_archivoPrueba(ObjContenido)),
      (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "FOTO_INVALIDA",
    );
  }
});

test("Produccion_limpiarNombreFoto elimina ruta, controles y limita longitud", () => {
  const StrResultado = Produccion_limpiarNombreFoto(`C:\\temporal\\foto\u0000${"x".repeat(300)}.jpg`);
  assert.equal(StrResultado.length, 255);
  assert.equal(StrResultado.includes("\\"), false);
  assert.equal(StrResultado.includes("\u0000"), false);
});
