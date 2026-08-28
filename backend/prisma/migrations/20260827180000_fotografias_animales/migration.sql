CREATE TABLE [dbo].[produccion_animales_fotos] (
    [animal_foto_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT NOT NULL,
    [blob_nombre] NVARCHAR(500) NOT NULL,
    [nombre_original] NVARCHAR(255) NOT NULL,
    [mime_type] NVARCHAR(50) NOT NULL,
    [tamano_bytes] INT NOT NULL,
    [ancho_pixeles] INT NOT NULL,
    [alto_pixeles] INT NOT NULL,
    [es_principal] BIT NOT NULL CONSTRAINT [produccion_animales_fotos_es_principal_df] DEFAULT 1,
    [creado_por_usuario_id] INT NOT NULL,
    [fecha_creacion] DATETIME2(7) NOT NULL CONSTRAINT [produccion_animales_fotos_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [produccion_animales_fotos_pkey] PRIMARY KEY CLUSTERED ([animal_foto_id]),
    CONSTRAINT [produccion_animales_fotos_blob_nombre_key] UNIQUE NONCLUSTERED ([blob_nombre]),
    CONSTRAINT [produccion_animales_fotos_archivo_check] CHECK ([tamano_bytes] > 0 AND [ancho_pixeles] > 0 AND [alto_pixeles] > 0 AND [mime_type] = N'image/webp'),
    CONSTRAINT [produccion_animales_fotos_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [produccion_animales_fotos_creado_por_usuario_id_fkey] FOREIGN KEY ([creado_por_usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [produccion_animales_fotos_animal_id_fecha_creacion_idx]
ON [dbo].[produccion_animales_fotos]([animal_id], [fecha_creacion]);

CREATE INDEX [produccion_animales_fotos_creado_por_usuario_id_idx]
ON [dbo].[produccion_animales_fotos]([creado_por_usuario_id]);

CREATE UNIQUE INDEX [produccion_animales_fotos_principal_unica]
ON [dbo].[produccion_animales_fotos]([animal_id])
WHERE [es_principal] = 1;
