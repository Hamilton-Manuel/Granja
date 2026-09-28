-- Ampliar únicamente las unidades admitidas para ingredientes.
-- No modifica filas, factores, costos ni restricciones del producto terminado.
-- La dimensión procede del catálogo (PESO/VOLUMEN/UNIDADES); la compatibilidad
-- producto-unidad se valida en el servicio dentro de la transacción.
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  ALTER TABLE dbo.alimentacion_recetas_concentrados_detalles DROP CONSTRAINT CK_concentrados_ingrediente;
  ALTER TABLE dbo.alimentacion_recetas_concentrados_detalles WITH CHECK ADD CONSTRAINT CK_concentrados_ingrediente
    CHECK (cantidad > 0 AND LEN(LTRIM(RTRIM(unidad_medida))) > 0);
  -- La FK existente mantiene cada unidad de receta vinculada al catálogo.
  ALTER TABLE dbo.alimentacion_elaboraciones_detalles DROP CONSTRAINT CK_elaboraciones_detalle;
  ALTER TABLE dbo.alimentacion_elaboraciones_detalles WITH CHECK ADD CONSTRAINT CK_elaboraciones_detalle
    CHECK (cantidad_receta > 0 AND cantidad_consumida > 0
      AND factor_referencia_receta > 0 AND factor_referencia_base > 0
      AND LEN(LTRIM(RTRIM(unidad_receta_snapshot))) > 0
      AND LEN(LTRIM(RTRIM(unidad_base_snapshot))) > 0);
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
