BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[inventario_transacciones] (
    [transaccion_inventario_id] INT NOT NULL IDENTITY(1,1),
    [inventario_producto_id] INT NOT NULL,
    [lote_inventario_id] INT,
    [usuario_id] INT NOT NULL,
    [proveedor_id] INT,
    [lote_produccion_id] INT,
    [animal_id] INT,
    [alimentacion_detalle_id] INT,
    [aplicacion_sanitaria_id] INT,
    [tipo_transaccion] NVARCHAR(30) NOT NULL,
    [cantidad] DECIMAL(18,4) NOT NULL,
    [costo_unitario] DECIMAL(18,4),
    [documento_referencia] NVARCHAR(150),
    [motivo] NVARCHAR(500),
    [observaciones] NVARCHAR(1000),
    [fecha_transaccion] DATETIME2 NOT NULL CONSTRAINT [inventario_transacciones_fecha_transaccion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [inventario_transacciones_pkey] PRIMARY KEY CLUSTERED ([transaccion_inventario_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_transacciones] (
    [transaccion_produccion_id] INT NOT NULL IDENTITY(1,1),
    [lote_produccion_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [venta_detalle_id] INT,
    [tipo_transaccion] NVARCHAR(30) NOT NULL,
    [cantidad] INT NOT NULL,
    [documento_referencia] NVARCHAR(150),
    [motivo] NVARCHAR(500),
    [observaciones] NVARCHAR(1000),
    [fecha_transaccion] DATETIME2 NOT NULL CONSTRAINT [produccion_transacciones_fecha_transaccion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [produccion_transacciones_pkey] PRIMARY KEY CLUSTERED ([transaccion_produccion_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_eventos] (
    [evento_produccion_id] INT NOT NULL IDENTITY(1,1),
    [lote_produccion_id] INT,
    [animal_id] INT,
    [usuario_id] INT NOT NULL,
    [tipo_evento] NVARCHAR(50) NOT NULL,
    [referencia_tipo] NVARCHAR(100),
    [referencia_id] INT,
    [fecha_evento] DATETIME2 NOT NULL CONSTRAINT [produccion_eventos_fecha_evento_df] DEFAULT CURRENT_TIMESTAMP,
    [descripcion] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [produccion_eventos_pkey] PRIMARY KEY CLUSTERED ([evento_produccion_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_inventario_producto_id_idx] ON [dbo].[inventario_transacciones]([inventario_producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_lote_inventario_id_idx] ON [dbo].[inventario_transacciones]([lote_inventario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_usuario_id_idx] ON [dbo].[inventario_transacciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_proveedor_id_idx] ON [dbo].[inventario_transacciones]([proveedor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_lote_produccion_id_idx] ON [dbo].[inventario_transacciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_animal_id_idx] ON [dbo].[inventario_transacciones]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_alimentacion_detalle_id_idx] ON [dbo].[inventario_transacciones]([alimentacion_detalle_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_aplicacion_sanitaria_id_idx] ON [dbo].[inventario_transacciones]([aplicacion_sanitaria_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_tipo_transaccion_idx] ON [dbo].[inventario_transacciones]([tipo_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_fecha_transaccion_idx] ON [dbo].[inventario_transacciones]([fecha_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_lote_produccion_id_idx] ON [dbo].[produccion_transacciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_usuario_id_idx] ON [dbo].[produccion_transacciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_venta_detalle_id_idx] ON [dbo].[produccion_transacciones]([venta_detalle_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_tipo_transaccion_idx] ON [dbo].[produccion_transacciones]([tipo_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_fecha_transaccion_idx] ON [dbo].[produccion_transacciones]([fecha_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_lote_produccion_id_idx] ON [dbo].[produccion_eventos]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_animal_id_idx] ON [dbo].[produccion_eventos]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_usuario_id_idx] ON [dbo].[produccion_eventos]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_tipo_evento_idx] ON [dbo].[produccion_eventos]([tipo_evento]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_fecha_evento_idx] ON [dbo].[produccion_eventos]([fecha_evento]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_referencia_tipo_referencia_id_idx] ON [dbo].[produccion_eventos]([referencia_tipo], [referencia_id]);

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_inventario_producto_id_fkey] FOREIGN KEY ([inventario_producto_id]) REFERENCES [dbo].[inventario_existencias]([inventario_producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_lote_inventario_id_fkey] FOREIGN KEY ([lote_inventario_id]) REFERENCES [dbo].[inventario_lotes]([lote_inventario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_proveedor_id_fkey] FOREIGN KEY ([proveedor_id]) REFERENCES [dbo].[proveedores_registros]([proveedor_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_alimentacion_detalle_id_fkey] FOREIGN KEY ([alimentacion_detalle_id]) REFERENCES [dbo].[alimentacion_detalles]([detalle_alimentacion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_aplicacion_sanitaria_id_fkey] FOREIGN KEY ([aplicacion_sanitaria_id]) REFERENCES [dbo].[sanidad_aplicaciones]([aplicacion_sanitaria_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_venta_detalle_id_fkey] FOREIGN KEY ([venta_detalle_id]) REFERENCES [dbo].[ventas_detalles]([detalle_venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ======================================================
-- REGLAS DE INTEGRIDAD - INVENTARIO
-- ======================================================

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_cantidad]
CHECK (
    [cantidad] <> 0
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_tipo_cantidad]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [cantidad] > 0)
    OR
    ([tipo_transaccion] = N'SALIDA' AND [cantidad] < 0)
    OR
    ([tipo_transaccion] = N'AJUSTE' AND [cantidad] <> 0)
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_tipo]
CHECK (
    [tipo_transaccion] IN (N'INGRESO', N'SALIDA', N'AJUSTE')
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_costo]
CHECK (
    [costo_unitario] IS NULL
    OR [costo_unitario] >= 0
);


-- ======================================================
-- REGLAS DE INTEGRIDAD - PRODUCCIÓN / TRANSACCIONES
-- ======================================================

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_tipo]
CHECK (
    [tipo_transaccion] IN (N'INGRESO', N'VENTA')
);

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_cantidad]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [cantidad] > 0)
    OR
    ([tipo_transaccion] = N'VENTA' AND [cantidad] < 0)
);

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_venta_detalle]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [venta_detalle_id] IS NULL)
    OR
    ([tipo_transaccion] = N'VENTA' AND [venta_detalle_id] IS NOT NULL)
);

CREATE UNIQUE INDEX [UX_produccion_transacciones_venta_detalle]
ON [dbo].[produccion_transacciones] ([venta_detalle_id])
WHERE [venta_detalle_id] IS NOT NULL;


-- ======================================================
-- REGLAS DE INTEGRIDAD - PRODUCCIÓN / EVENTOS
-- ======================================================

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_destino]
CHECK (
    [animal_id] IS NOT NULL
    OR [lote_produccion_id] IS NOT NULL
);

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_tipo]
CHECK (
    [tipo_evento] IN (
        N'MEDICION',
        N'ALIMENTACION',
        N'APLICACION_SANITARIA',
        N'CAMBIO_LOTE',
        N'CAMBIO_ESTADO'
    )
);

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_referencia]
CHECK (
    ([referencia_tipo] IS NULL AND [referencia_id] IS NULL)
    OR
    ([referencia_tipo] IS NOT NULL AND [referencia_id] IS NOT NULL)
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
