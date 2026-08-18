BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[produccion_tipos_animales] (
    [tipo_animal_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [produccion_tipos_animales_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_tipos_animales_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [produccion_tipos_animales_pkey] PRIMARY KEY CLUSTERED ([tipo_animal_id]),
    CONSTRAINT [produccion_tipos_animales_nombre_key] UNIQUE NONCLUSTERED ([nombre])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_razas] (
    [raza_id] INT NOT NULL IDENTITY(1,1),
    [tipo_animal_id] INT NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [produccion_razas_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_razas_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [produccion_razas_pkey] PRIMARY KEY CLUSTERED ([raza_id]),
    CONSTRAINT [produccion_razas_tipo_animal_id_nombre_key] UNIQUE NONCLUSTERED ([tipo_animal_id],[nombre])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_lotes] (
    [lote_produccion_id] INT NOT NULL IDENTITY(1,1),
    [codigo] NVARCHAR(50) NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [produccion_lotes_fecha_inicio_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_cierre] DATETIME2,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [produccion_lotes_estado_df] DEFAULT 'ACTIVO',
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_lotes_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [produccion_lotes_pkey] PRIMARY KEY CLUSTERED ([lote_produccion_id]),
    CONSTRAINT [produccion_lotes_codigo_key] UNIQUE NONCLUSTERED ([codigo])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_animales] (
    [animal_id] INT NOT NULL IDENTITY(1,1),
    [tipo_animal_id] INT NOT NULL,
    [raza_id] INT,
    [identificacion] NVARCHAR(100) NOT NULL,
    [sexo] NVARCHAR(20) NOT NULL,
    [fecha_nacimiento] DATE,
    [fecha_ingreso] DATETIME2 NOT NULL CONSTRAINT [produccion_animales_fecha_ingreso_df] DEFAULT CURRENT_TIMESTAMP,
    [estado_actual] NVARCHAR(20) NOT NULL CONSTRAINT [produccion_animales_estado_actual_df] DEFAULT 'ACTIVO',
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_animales_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [produccion_animales_pkey] PRIMARY KEY CLUSTERED ([animal_id]),
    CONSTRAINT [produccion_animales_identificacion_key] UNIQUE NONCLUSTERED ([identificacion])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_asignaciones_lotes] (
    [asignacion_lote_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT NOT NULL,
    [lote_produccion_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [produccion_asignaciones_lotes_fecha_inicio_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_fin] DATETIME2,
    [motivo_cambio] NVARCHAR(500),
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [produccion_asignaciones_lotes_estado_df] DEFAULT 'VIGENTE',
    CONSTRAINT [produccion_asignaciones_lotes_pkey] PRIMARY KEY CLUSTERED ([asignacion_lote_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_historial_estados] (
    [historial_estado_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [estado_anterior] NVARCHAR(30),
    [estado_nuevo] NVARCHAR(30) NOT NULL,
    [motivo] NVARCHAR(500),
    [fecha_cambio] DATETIME2 NOT NULL CONSTRAINT [produccion_historial_estados_fecha_cambio_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [produccion_historial_estados_pkey] PRIMARY KEY CLUSTERED ([historial_estado_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_mediciones] (
    [medicion_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT,
    [lote_produccion_id] INT,
    [usuario_id] INT NOT NULL,
    [tipo_medicion] NVARCHAR(50) NOT NULL,
    [valor] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [fecha_medicion] DATETIME2 NOT NULL CONSTRAINT [produccion_mediciones_fecha_medicion_df] DEFAULT CURRENT_TIMESTAMP,
    [observaciones] NVARCHAR(1000),
    CONSTRAINT [produccion_mediciones_pkey] PRIMARY KEY CLUSTERED ([medicion_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_tipos_animales_activo_idx] ON [dbo].[produccion_tipos_animales]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_razas_tipo_animal_id_idx] ON [dbo].[produccion_razas]([tipo_animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_razas_activo_idx] ON [dbo].[produccion_razas]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_lotes_estado_idx] ON [dbo].[produccion_lotes]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_lotes_fecha_inicio_idx] ON [dbo].[produccion_lotes]([fecha_inicio]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_animales_tipo_animal_id_idx] ON [dbo].[produccion_animales]([tipo_animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_animales_raza_id_idx] ON [dbo].[produccion_animales]([raza_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_animales_estado_actual_idx] ON [dbo].[produccion_animales]([estado_actual]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_asignaciones_lotes_animal_id_idx] ON [dbo].[produccion_asignaciones_lotes]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_asignaciones_lotes_lote_produccion_id_idx] ON [dbo].[produccion_asignaciones_lotes]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_asignaciones_lotes_usuario_id_idx] ON [dbo].[produccion_asignaciones_lotes]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_asignaciones_lotes_estado_idx] ON [dbo].[produccion_asignaciones_lotes]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_historial_estados_animal_id_idx] ON [dbo].[produccion_historial_estados]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_historial_estados_usuario_id_idx] ON [dbo].[produccion_historial_estados]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_historial_estados_fecha_cambio_idx] ON [dbo].[produccion_historial_estados]([fecha_cambio]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_mediciones_animal_id_idx] ON [dbo].[produccion_mediciones]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_mediciones_lote_produccion_id_idx] ON [dbo].[produccion_mediciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_mediciones_usuario_id_idx] ON [dbo].[produccion_mediciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_mediciones_fecha_medicion_idx] ON [dbo].[produccion_mediciones]([fecha_medicion]);

-- AddForeignKey
ALTER TABLE [dbo].[produccion_razas] ADD CONSTRAINT [produccion_razas_tipo_animal_id_fkey] FOREIGN KEY ([tipo_animal_id]) REFERENCES [dbo].[produccion_tipos_animales]([tipo_animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_animales] ADD CONSTRAINT [produccion_animales_tipo_animal_id_fkey] FOREIGN KEY ([tipo_animal_id]) REFERENCES [dbo].[produccion_tipos_animales]([tipo_animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_animales] ADD CONSTRAINT [produccion_animales_raza_id_fkey] FOREIGN KEY ([raza_id]) REFERENCES [dbo].[produccion_razas]([raza_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_asignaciones_lotes] ADD CONSTRAINT [produccion_asignaciones_lotes_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_asignaciones_lotes] ADD CONSTRAINT [produccion_asignaciones_lotes_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_asignaciones_lotes] ADD CONSTRAINT [produccion_asignaciones_lotes_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_historial_estados] ADD CONSTRAINT [produccion_historial_estados_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_historial_estados] ADD CONSTRAINT [produccion_historial_estados_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_mediciones] ADD CONSTRAINT [produccion_mediciones_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_mediciones] ADD CONSTRAINT [produccion_mediciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_mediciones] ADD CONSTRAINT [produccion_mediciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
