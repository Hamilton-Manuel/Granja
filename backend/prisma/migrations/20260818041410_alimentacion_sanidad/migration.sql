BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[alimentacion_formulas] (
    [formula_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [cantidad_base] DECIMAL(18,4) NOT NULL,
    [unidad_base] NVARCHAR(30) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_formulas_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [alimentacion_formulas_pkey] PRIMARY KEY CLUSTERED ([formula_id]),
    CONSTRAINT [alimentacion_formulas_nombre_key] UNIQUE NONCLUSTERED ([nombre])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_formulas_detalles] (
    [detalle_formula_id] INT NOT NULL IDENTITY(1,1),
    [formula_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [cantidad] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_formulas_detalles_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_detalles_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [alimentacion_formulas_detalles_pkey] PRIMARY KEY CLUSTERED ([detalle_formula_id]),
    CONSTRAINT [alimentacion_formulas_detalles_formula_id_producto_id_key] UNIQUE NONCLUSTERED ([formula_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_asignaciones] (
    [asignacion_formula_id] INT NOT NULL IDENTITY(1,1),
    [formula_id] INT NOT NULL,
    [animal_id] INT,
    [lote_produccion_id] INT,
    [usuario_id] INT NOT NULL,
    [fecha_inicio] DATE NOT NULL,
    [fecha_fin] DATE,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [alimentacion_asignaciones_estado_df] DEFAULT 'VIGENTE',
    [observaciones] NVARCHAR(1000),
    CONSTRAINT [alimentacion_asignaciones_pkey] PRIMARY KEY CLUSTERED ([asignacion_formula_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_registros] (
    [alimentacion_id] INT NOT NULL IDENTITY(1,1),
    [formula_id] INT NOT NULL,
    [animal_id] INT,
    [lote_produccion_id] INT,
    [usuario_id] INT NOT NULL,
    [fecha_alimentacion] DATE NOT NULL,
    [cantidad_suministrada] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [observaciones] NVARCHAR(1000),
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [alimentacion_registros_fecha_registro_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [alimentacion_registros_pkey] PRIMARY KEY CLUSTERED ([alimentacion_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_detalles] (
    [detalle_alimentacion_id] INT NOT NULL IDENTITY(1,1),
    [alimentacion_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [cantidad_consumida] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [alimentacion_detalles_fecha_registro_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [alimentacion_detalles_pkey] PRIMARY KEY CLUSTERED ([detalle_alimentacion_id]),
    CONSTRAINT [alimentacion_detalles_alimentacion_id_producto_id_key] UNIQUE NONCLUSTERED ([alimentacion_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[sanidad_aplicaciones] (
    [aplicacion_sanitaria_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT,
    [lote_produccion_id] INT,
    [producto_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [tipo_aplicacion] NVARCHAR(50) NOT NULL,
    [dosis] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [cantidad_total_utilizada] DECIMAL(18,4) NOT NULL,
    [fecha_aplicacion] DATE NOT NULL,
    [proxima_aplicacion] DATE,
    [observaciones] NVARCHAR(1000),
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [sanidad_aplicaciones_fecha_registro_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [sanidad_aplicaciones_pkey] PRIMARY KEY CLUSTERED ([aplicacion_sanitaria_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_formulas_activo_idx] ON [dbo].[alimentacion_formulas]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_formulas_detalles_formula_id_idx] ON [dbo].[alimentacion_formulas_detalles]([formula_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_formulas_detalles_producto_id_idx] ON [dbo].[alimentacion_formulas_detalles]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_formulas_detalles_activo_idx] ON [dbo].[alimentacion_formulas_detalles]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_asignaciones_formula_id_idx] ON [dbo].[alimentacion_asignaciones]([formula_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_asignaciones_animal_id_idx] ON [dbo].[alimentacion_asignaciones]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_asignaciones_lote_produccion_id_idx] ON [dbo].[alimentacion_asignaciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_asignaciones_usuario_id_idx] ON [dbo].[alimentacion_asignaciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_asignaciones_estado_idx] ON [dbo].[alimentacion_asignaciones]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_registros_formula_id_idx] ON [dbo].[alimentacion_registros]([formula_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_registros_animal_id_idx] ON [dbo].[alimentacion_registros]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_registros_lote_produccion_id_idx] ON [dbo].[alimentacion_registros]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_registros_usuario_id_idx] ON [dbo].[alimentacion_registros]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_registros_fecha_alimentacion_idx] ON [dbo].[alimentacion_registros]([fecha_alimentacion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_detalles_alimentacion_id_idx] ON [dbo].[alimentacion_detalles]([alimentacion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alimentacion_detalles_producto_id_idx] ON [dbo].[alimentacion_detalles]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_animal_id_idx] ON [dbo].[sanidad_aplicaciones]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_lote_produccion_id_idx] ON [dbo].[sanidad_aplicaciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_producto_id_idx] ON [dbo].[sanidad_aplicaciones]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_usuario_id_idx] ON [dbo].[sanidad_aplicaciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_tipo_aplicacion_idx] ON [dbo].[sanidad_aplicaciones]([tipo_aplicacion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sanidad_aplicaciones_fecha_aplicacion_idx] ON [dbo].[sanidad_aplicaciones]([fecha_aplicacion]);

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_formulas_detalles] ADD CONSTRAINT [alimentacion_formulas_detalles_formula_id_fkey] FOREIGN KEY ([formula_id]) REFERENCES [dbo].[alimentacion_formulas]([formula_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_formulas_detalles] ADD CONSTRAINT [alimentacion_formulas_detalles_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_asignaciones] ADD CONSTRAINT [alimentacion_asignaciones_formula_id_fkey] FOREIGN KEY ([formula_id]) REFERENCES [dbo].[alimentacion_formulas]([formula_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_asignaciones] ADD CONSTRAINT [alimentacion_asignaciones_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_asignaciones] ADD CONSTRAINT [alimentacion_asignaciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_asignaciones] ADD CONSTRAINT [alimentacion_asignaciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_registros] ADD CONSTRAINT [alimentacion_registros_formula_id_fkey] FOREIGN KEY ([formula_id]) REFERENCES [dbo].[alimentacion_formulas]([formula_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_registros] ADD CONSTRAINT [alimentacion_registros_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_registros] ADD CONSTRAINT [alimentacion_registros_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_registros] ADD CONSTRAINT [alimentacion_registros_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_detalles] ADD CONSTRAINT [alimentacion_detalles_alimentacion_id_fkey] FOREIGN KEY ([alimentacion_id]) REFERENCES [dbo].[alimentacion_registros]([alimentacion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alimentacion_detalles] ADD CONSTRAINT [alimentacion_detalles_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sanidad_aplicaciones] ADD CONSTRAINT [sanidad_aplicaciones_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sanidad_aplicaciones] ADD CONSTRAINT [sanidad_aplicaciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sanidad_aplicaciones] ADD CONSTRAINT [sanidad_aplicaciones_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sanidad_aplicaciones] ADD CONSTRAINT [sanidad_aplicaciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ======================================================
-- REGLAS DE INTEGRIDAD - ALIMENTACIÓN
-- ======================================================

-- La asignación debe corresponder exactamente a un animal
-- o a un lote de producción.
ALTER TABLE [dbo].[alimentacion_asignaciones]
ADD CONSTRAINT [CK_alimentacion_asignaciones_destino]
CHECK (
    ([animal_id] IS NOT NULL AND [lote_produccion_id] IS NULL)
    OR
    ([animal_id] IS NULL AND [lote_produccion_id] IS NOT NULL)
);

-- La fecha final no puede ser anterior a la fecha inicial.
ALTER TABLE [dbo].[alimentacion_asignaciones]
ADD CONSTRAINT [CK_alimentacion_asignaciones_fechas]
CHECK (
    [fecha_fin] IS NULL
    OR [fecha_fin] >= [fecha_inicio]
);

-- Un registro de alimentación debe pertenecer exactamente
-- a un animal o a un lote.
ALTER TABLE [dbo].[alimentacion_registros]
ADD CONSTRAINT [CK_alimentacion_registros_destino]
CHECK (
    ([animal_id] IS NOT NULL AND [lote_produccion_id] IS NULL)
    OR
    ([animal_id] IS NULL AND [lote_produccion_id] IS NOT NULL)
);

ALTER TABLE [dbo].[alimentacion_formulas]
ADD CONSTRAINT [CK_alimentacion_formulas_cantidad_base]
CHECK ([cantidad_base] > 0);

ALTER TABLE [dbo].[alimentacion_formulas_detalles]
ADD CONSTRAINT [CK_alimentacion_formulas_detalles_cantidad]
CHECK ([cantidad] > 0);

ALTER TABLE [dbo].[alimentacion_registros]
ADD CONSTRAINT [CK_alimentacion_registros_cantidad]
CHECK ([cantidad_suministrada] > 0);

ALTER TABLE [dbo].[alimentacion_detalles]
ADD CONSTRAINT [CK_alimentacion_detalles_cantidad]
CHECK ([cantidad_consumida] > 0);


-- ======================================================
-- REGLAS DE INTEGRIDAD - SANIDAD
-- ======================================================

-- Una aplicación sanitaria debe corresponder exactamente
-- a un animal o a un lote.
ALTER TABLE [dbo].[sanidad_aplicaciones]
ADD CONSTRAINT [CK_sanidad_aplicaciones_destino]
CHECK (
    ([animal_id] IS NOT NULL AND [lote_produccion_id] IS NULL)
    OR
    ([animal_id] IS NULL AND [lote_produccion_id] IS NOT NULL)
);

ALTER TABLE [dbo].[sanidad_aplicaciones]
ADD CONSTRAINT [CK_sanidad_aplicaciones_dosis]
CHECK ([dosis] > 0);

ALTER TABLE [dbo].[sanidad_aplicaciones]
ADD CONSTRAINT [CK_sanidad_aplicaciones_cantidad_total]
CHECK ([cantidad_total_utilizada] > 0);

ALTER TABLE [dbo].[sanidad_aplicaciones]
ADD CONSTRAINT [CK_sanidad_aplicaciones_proxima_fecha]
CHECK (
    [proxima_aplicacion] IS NULL
    OR [proxima_aplicacion] >= [fecha_aplicacion]
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
