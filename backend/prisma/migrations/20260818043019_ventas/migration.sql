BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ventas_registros] (
    [venta_id] INT NOT NULL IDENTITY(1,1),
    [cliente_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [fecha_venta] DATETIME2 NOT NULL CONSTRAINT [ventas_registros_fecha_venta_df] DEFAULT CURRENT_TIMESTAMP,
    [subtotal] DECIMAL(18,2) NOT NULL,
    [descuento] DECIMAL(18,2) NOT NULL CONSTRAINT [ventas_registros_descuento_df] DEFAULT 0,
    [total] DECIMAL(18,2) NOT NULL,
    [forma_pago] NVARCHAR(50) NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [ventas_registros_estado_df] DEFAULT 'PENDIENTE',
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_registros_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [ventas_registros_pkey] PRIMARY KEY CLUSTERED ([venta_id])
);

-- CreateTable
CREATE TABLE [dbo].[ventas_detalles] (
    [detalle_venta_id] INT NOT NULL IDENTITY(1,1),
    [venta_id] INT NOT NULL,
    [lote_produccion_id] INT NOT NULL,
    [cantidad_animales] INT NOT NULL,
    [precio_unitario] DECIMAL(18,2) NOT NULL,
    [subtotal] DECIMAL(18,2) NOT NULL,
    [descripcion] NVARCHAR(500),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_detalles_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ventas_detalles_pkey] PRIMARY KEY CLUSTERED ([detalle_venta_id]),
    CONSTRAINT [ventas_detalles_venta_id_lote_produccion_id_key] UNIQUE NONCLUSTERED ([venta_id],[lote_produccion_id])
);

-- CreateTable
CREATE TABLE [dbo].[ventas_recibos] (
    [recibo_id] INT NOT NULL IDENTITY(1,1),
    [venta_id] INT NOT NULL,
    [numero_recibo] NVARCHAR(50) NOT NULL,
    [fecha_emision] DATETIME2 NOT NULL CONSTRAINT [ventas_recibos_fecha_emision_df] DEFAULT CURRENT_TIMESTAMP,
    [monto] DECIMAL(18,2) NOT NULL,
    [concepto] NVARCHAR(1000) NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [ventas_recibos_estado_df] DEFAULT 'EMITIDO',
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_recibos_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ventas_recibos_pkey] PRIMARY KEY CLUSTERED ([recibo_id]),
    CONSTRAINT [ventas_recibos_venta_id_key] UNIQUE NONCLUSTERED ([venta_id]),
    CONSTRAINT [ventas_recibos_numero_recibo_key] UNIQUE NONCLUSTERED ([numero_recibo])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_cliente_id_idx] ON [dbo].[ventas_registros]([cliente_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_usuario_id_idx] ON [dbo].[ventas_registros]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_fecha_venta_idx] ON [dbo].[ventas_registros]([fecha_venta]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_estado_idx] ON [dbo].[ventas_registros]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_detalles_venta_id_idx] ON [dbo].[ventas_detalles]([venta_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_detalles_lote_produccion_id_idx] ON [dbo].[ventas_detalles]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_recibos_fecha_emision_idx] ON [dbo].[ventas_recibos]([fecha_emision]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_recibos_estado_idx] ON [dbo].[ventas_recibos]([estado]);

-- AddForeignKey
ALTER TABLE [dbo].[ventas_registros] ADD CONSTRAINT [ventas_registros_cliente_id_fkey] FOREIGN KEY ([cliente_id]) REFERENCES [dbo].[clientes_registros]([cliente_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_registros] ADD CONSTRAINT [ventas_registros_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_detalles] ADD CONSTRAINT [ventas_detalles_venta_id_fkey] FOREIGN KEY ([venta_id]) REFERENCES [dbo].[ventas_registros]([venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_detalles] ADD CONSTRAINT [ventas_detalles_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_recibos] ADD CONSTRAINT [ventas_recibos_venta_id_fkey] FOREIGN KEY ([venta_id]) REFERENCES [dbo].[ventas_registros]([venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ======================================================
-- REGLAS DE INTEGRIDAD - VENTAS
-- ======================================================

-- Los montos principales de la venta no pueden ser negativos.
-- El descuento no puede superar el subtotal y el total debe
-- corresponder exactamente a subtotal - descuento.
ALTER TABLE [dbo].[ventas_registros]
ADD CONSTRAINT [CK_ventas_registros_montos]
CHECK (
    [subtotal] >= 0
    AND [descuento] >= 0
    AND [descuento] <= [subtotal]
    AND [total] >= 0
    AND [total] = ([subtotal] - [descuento])
);

-- Estados permitidos para una venta.
ALTER TABLE [dbo].[ventas_registros]
ADD CONSTRAINT [CK_ventas_registros_estado]
CHECK (
    [estado] IN (N'PENDIENTE', N'CONFIRMADA', N'ANULADA')
);

-- La cantidad vendida debe ser mayor que cero.
-- El precio no puede ser negativo.
-- El subtotal debe coincidir con cantidad * precio unitario.
ALTER TABLE [dbo].[ventas_detalles]
ADD CONSTRAINT [CK_ventas_detalles_valores]
CHECK (
    [cantidad_animales] > 0
    AND [precio_unitario] >= 0
    AND [subtotal] >= 0
    AND [subtotal] = ([cantidad_animales] * [precio_unitario])
);

-- El monto del recibo no puede ser negativo.
ALTER TABLE [dbo].[ventas_recibos]
ADD CONSTRAINT [CK_ventas_recibos_monto]
CHECK (
    [monto] >= 0
);

-- Estados permitidos para un recibo.
ALTER TABLE [dbo].[ventas_recibos]
ADD CONSTRAINT [CK_ventas_recibos_estado]
CHECK (
    [estado] IN (N'EMITIDO', N'ANULADO')
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
