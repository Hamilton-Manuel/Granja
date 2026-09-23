BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[alimentacion_concentrados] (
    [concentrado_id] INT NOT NULL IDENTITY(1,1),
    [producto_id] INT NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_concentrados_activo_df] DEFAULT 1,
    [usuario_id] INT NOT NULL,
    [fecha_creacion] DATETIME2 NOT NULL,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [alimentacion_concentrados_pkey] PRIMARY KEY CLUSTERED ([concentrado_id]),
    CONSTRAINT [alimentacion_concentrados_producto_id_key] UNIQUE NONCLUSTERED ([producto_id]),
    CONSTRAINT [alimentacion_concentrados_concentrado_id_producto_id_key] UNIQUE NONCLUSTERED ([concentrado_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_recetas_concentrados] (
    [receta_id] INT NOT NULL IDENTITY(1,1),
    [concentrado_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [cantidad_base] DECIMAL(24,6) NOT NULL,
    [unidad_base] NVARCHAR(20) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [alimentacion_recetas_concentrados_version_df] DEFAULT 1,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_recetas_concentrados_activo_df] DEFAULT 1,
    [usuario_id] INT NOT NULL,
    [usuario_actualizacion_id] INT NOT NULL,
    [fecha_creacion] DATETIME2 NOT NULL,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [alimentacion_recetas_concentrados_pkey] PRIMARY KEY CLUSTERED ([receta_id]),
    CONSTRAINT [alimentacion_recetas_concentrados_receta_id_producto_id_key] UNIQUE NONCLUSTERED ([receta_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_recetas_concentrados_detalles] (
    [receta_detalle_id] INT NOT NULL IDENTITY(1,1),
    [receta_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [cantidad] DECIMAL(24,6) NOT NULL,
    [unidad_medida] NVARCHAR(20) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_recetas_concentrados_detalles_activo_df] DEFAULT 1,
    CONSTRAINT [alimentacion_recetas_concentrados_detalles_pkey] PRIMARY KEY CLUSTERED ([receta_detalle_id]),
    CONSTRAINT [alimentacion_recetas_concentrados_detalles_receta_id_producto_id_key] UNIQUE NONCLUSTERED ([receta_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_elaboraciones] (
    [elaboracion_id] INT NOT NULL IDENTITY(1,1),
    [receta_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [version_receta] INT NOT NULL,
    [nombre_receta_snapshot] NVARCHAR(150) NOT NULL,
    [codigo_producto_snapshot] NVARCHAR(50) NOT NULL,
    [nombre_producto_snapshot] NVARCHAR(200) NOT NULL,
    [cantidad_base_receta] DECIMAL(24,6) NOT NULL,
    [unidad_receta_snapshot] NVARCHAR(20) NOT NULL,
    [factor_referencia_receta] DECIMAL(30,15) NOT NULL,
    [cantidad_teorica] DECIMAL(24,6) NOT NULL,
    [cantidad_real] DECIMAL(24,6) NOT NULL,
    [unidad_captura] NVARCHAR(20) NOT NULL,
    [factor_referencia_captura] DECIMAL(30,15) NOT NULL,
    [cantidad_teorica_base] DECIMAL(24,6) NOT NULL,
    [cantidad_real_base] DECIMAL(24,6) NOT NULL,
    [unidad_base_snapshot] NVARCHAR(20) NOT NULL,
    [factor_referencia_base] DECIMAL(30,15) NOT NULL,
    [costo_total] DECIMAL(38,24) NOT NULL,
    [costo_unitario] DECIMAL(38,18) NOT NULL,
    [residual_valoracion] DECIMAL(38,24) NOT NULL,
    [motivo_diferencia] NVARCHAR(1000),
    [observaciones] NVARCHAR(1000),
    [fecha_efectiva] DATETIME2 NOT NULL,
    [fecha_creacion] DATETIME2 NOT NULL,
    [usuario_id] INT NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [alimentacion_elaboraciones_estado_df] DEFAULT 'CONFIRMADA',
    [usuario_reversion_id] INT,
    [fecha_reversion] DATETIME2,
    [motivo_reversion] NVARCHAR(500),
    [clave_idempotencia] UNIQUEIDENTIFIER NOT NULL,
    [hash_solicitud] CHAR(64) NOT NULL,
    [huella_previsualizacion] CHAR(64) NOT NULL,
    [lote_inventario_id] INT NOT NULL,
    [existencia_destino_id] INT NOT NULL,
    [transaccion_ingreso_id] INT NOT NULL,
    CONSTRAINT [alimentacion_elaboraciones_pkey] PRIMARY KEY CLUSTERED ([elaboracion_id]),
    CONSTRAINT [alimentacion_elaboraciones_clave_idempotencia_key] UNIQUE NONCLUSTERED ([clave_idempotencia]),
    CONSTRAINT [alimentacion_elaboraciones_lote_inventario_id_key] UNIQUE NONCLUSTERED ([lote_inventario_id]),
    CONSTRAINT [alimentacion_elaboraciones_transaccion_ingreso_id_key] UNIQUE NONCLUSTERED ([transaccion_ingreso_id]),
    CONSTRAINT [alimentacion_elaboraciones_transaccion_ingreso_id_existencia_destino_id_key] UNIQUE NONCLUSTERED ([transaccion_ingreso_id],[existencia_destino_id]),
    CONSTRAINT [alimentacion_elaboraciones_lote_inventario_id_producto_id_key] UNIQUE NONCLUSTERED ([lote_inventario_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_elaboraciones_detalles] (
    [elaboracion_detalle_id] INT NOT NULL IDENTITY(1,1),
    [elaboracion_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [codigo_producto_snapshot] NVARCHAR(50) NOT NULL,
    [nombre_producto_snapshot] NVARCHAR(200) NOT NULL,
    [cantidad_receta] DECIMAL(24,6) NOT NULL,
    [unidad_receta_snapshot] NVARCHAR(20) NOT NULL,
    [factor_referencia_receta] DECIMAL(30,15) NOT NULL,
    [unidad_base_snapshot] NVARCHAR(20) NOT NULL,
    [factor_referencia_base] DECIMAL(30,15) NOT NULL,
    [cantidad_consumida] DECIMAL(24,6) NOT NULL,
    CONSTRAINT [alimentacion_elaboraciones_detalles_pkey] PRIMARY KEY CLUSTERED ([elaboracion_detalle_id]),
    CONSTRAINT [alimentacion_elaboraciones_detalles_elaboracion_id_producto_id_key] UNIQUE NONCLUSTERED ([elaboracion_id],[producto_id]),
    CONSTRAINT [alimentacion_elaboraciones_detalles_elaboracion_detalle_id_producto_id_key] UNIQUE NONCLUSTERED ([elaboracion_detalle_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_elaboraciones_fuentes] (
    [elaboracion_fuente_id] INT NOT NULL IDENTITY(1,1),
    [elaboracion_detalle_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [existencia_lote_id] INT NOT NULL,
    [transaccion_consumo_id] INT NOT NULL,
    [cantidad_consumida] DECIMAL(24,6) NOT NULL,
    [costo_unitario_historico] DECIMAL(38,18) NOT NULL,
    [costo_total] DECIMAL(38,24) NOT NULL,
    CONSTRAINT [alimentacion_elaboraciones_fuentes_pkey] PRIMARY KEY CLUSTERED ([elaboracion_fuente_id]),
    CONSTRAINT [alimentacion_elaboraciones_fuentes_transaccion_consumo_id_key] UNIQUE NONCLUSTERED ([transaccion_consumo_id]),
    CONSTRAINT [alimentacion_elaboraciones_fuentes_transaccion_consumo_id_existencia_lote_id_key] UNIQUE NONCLUSTERED ([transaccion_consumo_id],[existencia_lote_id]),
    CONSTRAINT [alimentacion_elaboraciones_fuentes_elaboracion_detalle_id_existencia_lote_id_key] UNIQUE NONCLUSTERED ([elaboracion_detalle_id],[existencia_lote_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_concentrados_usuario_id_idx] ON [dbo].[alimentacion_concentrados]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_concentrado_id_producto_id_idx] ON [dbo].[alimentacion_recetas_concentrados]([concentrado_id], [producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_unidad_base_idx] ON [dbo].[alimentacion_recetas_concentrados]([unidad_base]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_usuario_id_idx] ON [dbo].[alimentacion_recetas_concentrados]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_usuario_actualizacion_id_idx] ON [dbo].[alimentacion_recetas_concentrados]([usuario_actualizacion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_detalles_producto_id_idx] ON [dbo].[alimentacion_recetas_concentrados_detalles]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_recetas_concentrados_detalles_unidad_medida_idx] ON [dbo].[alimentacion_recetas_concentrados_detalles]([unidad_medida]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_receta_id_producto_id_idx] ON [dbo].[alimentacion_elaboraciones]([receta_id], [producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_existencia_destino_id_producto_id_idx] ON [dbo].[alimentacion_elaboraciones]([existencia_destino_id], [producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_fecha_efectiva_idx] ON [dbo].[alimentacion_elaboraciones]([fecha_efectiva]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_estado_idx] ON [dbo].[alimentacion_elaboraciones]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_usuario_id_idx] ON [dbo].[alimentacion_elaboraciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_usuario_reversion_id_idx] ON [dbo].[alimentacion_elaboraciones]([usuario_reversion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_detalles_producto_id_idx] ON [dbo].[alimentacion_elaboraciones_detalles]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_fuentes_elaboracion_detalle_id_producto_id_idx] ON [dbo].[alimentacion_elaboraciones_fuentes]([elaboracion_detalle_id], [producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_elaboraciones_fuentes_existencia_lote_id_producto_id_idx] ON [dbo].[alimentacion_elaboraciones_fuentes]([existencia_lote_id], [producto_id]);

-- CreateIndex
ALTER TABLE [dbo].[inventario_existencias_lotes] ADD CONSTRAINT [inventario_existencias_lotes_existencia_lote_id_lote_inventario_id_producto_id_key] UNIQUE NONCLUSTERED ([existencia_lote_id], [lote_inventario_id], [producto_id]);

-- CreateIndex
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_transaccion_inventario_id_existencia_lote_id_key] UNIQUE NONCLUSTERED ([transaccion_inventario_id], [existencia_lote_id]);

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_concentrados] ADD CONSTRAINT [alimentacion_concentrados_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_concentrados] ADD CONSTRAINT [alimentacion_concentrados_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados] ADD CONSTRAINT [alimentacion_recetas_concentrados_concentrado_id_producto_id_fkey] FOREIGN KEY ([concentrado_id], [producto_id]) REFERENCES [dbo].[alimentacion_concentrados]([concentrado_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados] ADD CONSTRAINT [alimentacion_recetas_concentrados_unidad_base_fkey] FOREIGN KEY ([unidad_base]) REFERENCES [dbo].[inventario_unidades_medida]([codigo]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados] ADD CONSTRAINT [alimentacion_recetas_concentrados_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados] ADD CONSTRAINT [alimentacion_recetas_concentrados_usuario_actualizacion_id_fkey] FOREIGN KEY ([usuario_actualizacion_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados_detalles] ADD CONSTRAINT [alimentacion_recetas_concentrados_detalles_receta_id_fkey] FOREIGN KEY ([receta_id]) REFERENCES [dbo].[alimentacion_recetas_concentrados]([receta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados_detalles] ADD CONSTRAINT [alimentacion_recetas_concentrados_detalles_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_recetas_concentrados_detalles] ADD CONSTRAINT [alimentacion_recetas_concentrados_detalles_unidad_medida_fkey] FOREIGN KEY ([unidad_medida]) REFERENCES [dbo].[inventario_unidades_medida]([codigo]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_receta_id_producto_id_fkey] FOREIGN KEY ([receta_id], [producto_id]) REFERENCES [dbo].[alimentacion_recetas_concentrados]([receta_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_lote_inventario_id_producto_id_fkey] FOREIGN KEY ([lote_inventario_id], [producto_id]) REFERENCES [dbo].[inventario_lotes]([lote_inventario_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_existencia_destino_id_lote_inventario_id_producto_id_fkey] FOREIGN KEY ([existencia_destino_id], [lote_inventario_id], [producto_id]) REFERENCES [dbo].[inventario_existencias_lotes]([existencia_lote_id],[lote_inventario_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_transaccion_ingreso_id_existencia_destino_id_fkey] FOREIGN KEY ([transaccion_ingreso_id], [existencia_destino_id]) REFERENCES [dbo].[inventario_transacciones]([transaccion_inventario_id],[existencia_lote_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones] ADD CONSTRAINT [alimentacion_elaboraciones_usuario_reversion_id_fkey] FOREIGN KEY ([usuario_reversion_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones_detalles] ADD CONSTRAINT [alimentacion_elaboraciones_detalles_elaboracion_id_fkey] FOREIGN KEY ([elaboracion_id]) REFERENCES [dbo].[alimentacion_elaboraciones]([elaboracion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones_detalles] ADD CONSTRAINT [alimentacion_elaboraciones_detalles_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones_fuentes] ADD CONSTRAINT [alimentacion_elaboraciones_fuentes_elaboracion_detalle_id_producto_id_fkey] FOREIGN KEY ([elaboracion_detalle_id], [producto_id]) REFERENCES [dbo].[alimentacion_elaboraciones_detalles]([elaboracion_detalle_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones_fuentes] ADD CONSTRAINT [alimentacion_elaboraciones_fuentes_existencia_lote_id_producto_id_fkey] FOREIGN KEY ([existencia_lote_id], [producto_id]) REFERENCES [dbo].[inventario_existencias_lotes]([existencia_lote_id],[producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_elaboraciones_fuentes] ADD CONSTRAINT [alimentacion_elaboraciones_fuentes_transaccion_consumo_id_existencia_lote_id_fkey] FOREIGN KEY ([transaccion_consumo_id], [existencia_lote_id]) REFERENCES [dbo].[inventario_transacciones]([transaccion_inventario_id],[existencia_lote_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Restricciones del dominio. No actualizan datos ni costos anteriores.
ALTER TABLE dbo.alimentacion_recetas_concentrados ADD CONSTRAINT CK_concentrados_receta
CHECK (cantidad_base > 0 AND version > 0 AND unidad_base IN (N'g',N'kg',N'lb',N'oz',N'qq',N't'));
ALTER TABLE dbo.alimentacion_recetas_concentrados_detalles ADD CONSTRAINT CK_concentrados_ingrediente
CHECK (cantidad > 0 AND unidad_medida IN (N'g',N'kg',N'lb',N'oz',N'qq',N't'));
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_cantidades
CHECK (version_receta > 0 AND cantidad_base_receta > 0 AND cantidad_teorica > 0
  AND cantidad_real > 0 AND cantidad_teorica_base > 0 AND cantidad_real_base > 0
  AND factor_referencia_receta > 0 AND factor_referencia_captura > 0 AND factor_referencia_base > 0);
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_unidades
CHECK (unidad_receta_snapshot IN (N'g',N'kg',N'lb',N'oz',N'qq',N't')
  AND unidad_captura IN (N'g',N'kg',N'lb',N'oz',N'qq',N't')
  AND unidad_base_snapshot IN (N'g',N'kg',N'lb',N'oz',N'qq',N't'));
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_costos
CHECK (costo_total >= 0 AND costo_unitario >= 0);
-- El residual es firmado: puede ser positivo, negativo o cero.
-- La conciliacion exacta se calcula con Decimal; multiplicar DECIMAL(38,18)
-- por DECIMAL(24,6) en SQL puede reducir la escala del resultado.
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_diferencia
CHECK (cantidad_teorica = cantidad_real OR
  (motivo_diferencia IS NOT NULL AND LEN(LTRIM(RTRIM(motivo_diferencia))) > 0));
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_estado
CHECK ((estado = N'CONFIRMADA' AND usuario_reversion_id IS NULL AND fecha_reversion IS NULL AND motivo_reversion IS NULL)
  OR (estado = N'REVERTIDA' AND usuario_reversion_id IS NOT NULL AND fecha_reversion IS NOT NULL
      AND fecha_reversion >= fecha_creacion AND motivo_reversion IS NOT NULL AND LEN(LTRIM(RTRIM(motivo_reversion))) > 0));
ALTER TABLE dbo.alimentacion_elaboraciones ADD CONSTRAINT CK_elaboraciones_huellas
CHECK (LEN(hash_solicitud) = 64 AND hash_solicitud COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
  AND LEN(huella_previsualizacion) = 64 AND huella_previsualizacion COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%');
ALTER TABLE dbo.alimentacion_elaboraciones_detalles ADD CONSTRAINT CK_elaboraciones_detalle
CHECK (cantidad_receta > 0 AND cantidad_consumida > 0 AND factor_referencia_receta > 0 AND factor_referencia_base > 0
  AND unidad_receta_snapshot IN (N'g',N'kg',N'lb',N'oz',N'qq',N't')
  AND unidad_base_snapshot IN (N'g',N'kg',N'lb',N'oz',N'qq',N't'));
ALTER TABLE dbo.alimentacion_elaboraciones_fuentes ADD CONSTRAINT CK_elaboraciones_fuente
CHECK (cantidad_consumida > 0 AND costo_unitario_historico >= 0 AND costo_total >= 0);

-- Ampliacion de valores permitidos; se conservan todos los subtipos anteriores.
ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT CK_inventario_transacciones_tipo_subtipo;
ALTER TABLE dbo.inventario_transacciones WITH CHECK ADD CONSTRAINT CK_inventario_transacciones_tipo_subtipo CHECK (
 (tipo_transaccion = N'INGRESO' AND cantidad > 0 AND subtipo_transaccion IN (N'COMPRA',N'INVENTARIO_INICIAL',N'TRANSFERENCIA_ENTRADA',N'ELABORACION_INGRESO'))
 OR (tipo_transaccion = N'SALIDA' AND cantidad < 0 AND subtipo_transaccion IN (N'DEVOLUCION_PROVEEDOR',N'MERMA',N'DISPOSICION',N'ALIMENTACION',N'SANIDAD',N'TRANSFERENCIA_SALIDA',N'ELABORACION_CONSUMO'))
 OR (tipo_transaccion = N'AJUSTE' AND subtipo_transaccion IN (N'CONTEO_FISICO',N'REVERSION'))
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
