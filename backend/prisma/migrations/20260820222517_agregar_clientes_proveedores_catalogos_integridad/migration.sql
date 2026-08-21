SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    -- ======================================================
    -- GUARDS DEFENSIVOS SOBRE EL MODELO ANTERIOR
    -- ======================================================

    IF EXISTS (
        SELECT 1
        FROM [dbo].[clientes_registros]
        WHERE [tipo_cliente] IS NULL
           OR UPPER(REPLACE(LTRIM(RTRIM([tipo_cliente])), N' ', N'_'))
              NOT IN (N'PERSONA_INDIVIDUAL', N'PERSONA_JURIDICA')
    )
        THROW 51010, N'Existen tipos de Cliente incompatibles.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[proveedores_registros]
        WHERE [tipo_proveedor] IS NULL
           OR UPPER(REPLACE(LTRIM(RTRIM([tipo_proveedor])), N' ', N'_'))
              NOT IN (N'PERSONA_INDIVIDUAL', N'PERSONA_JURIDICA')
    )
        THROW 51011, N'Existen tipos de Proveedor incompatibles.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[proveedores_registros]
        WHERE UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')) = N'CF'
    )
        THROW 51012, N'Existe un Proveedor con NIT CF.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[clientes_registros]
        WHERE UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')) = N'CF'
    )
        THROW 51013, N'Existe un Cliente con documento CF.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[proveedores_registros]
        WHERE UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')) = N'CF'
    )
        THROW 51014, N'Existe un Proveedor con documento CF.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[clientes_registros]
        CROSS APPLY (VALUES (
            NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'')
        )) AS [normalizado]([valor])
        WHERE [normalizado].[valor] IS NOT NULL
          AND [normalizado].[valor] <> N'CF'
        GROUP BY [normalizado].[valor]
        HAVING COUNT_BIG(*) > 1
    )
        THROW 51015, N'Existen NIT duplicados en Clientes.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[proveedores_registros]
        CROSS APPLY (VALUES (
            NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'')
        )) AS [normalizado]([valor])
        WHERE [normalizado].[valor] IS NOT NULL
        GROUP BY [normalizado].[valor]
        HAVING COUNT_BIG(*) > 1
    )
        THROW 51016, N'Existen NIT duplicados en Proveedores.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[clientes_registros]
        CROSS APPLY (VALUES (
            NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'')
        )) AS [normalizado]([valor])
        WHERE [normalizado].[valor] IS NOT NULL
        GROUP BY [normalizado].[valor]
        HAVING COUNT_BIG(*) > 1
    )
        THROW 51017, N'Existen documentos duplicados en Clientes.', 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[proveedores_registros]
        CROSS APPLY (VALUES (
            NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'')
        )) AS [normalizado]([valor])
        WHERE [normalizado].[valor] IS NOT NULL
        GROUP BY [normalizado].[valor]
        HAVING COUNT_BIG(*) > 1
    )
        THROW 51018, N'Existen documentos duplicados en Proveedores.', 1;

    -- ======================================================
    -- CATÁLOGOS ESTRUCTURALES
    -- ======================================================

    CREATE TABLE [dbo].[clientes_tipos] (
        [tipo_cliente_id] INT NOT NULL IDENTITY(1,1),
        [codigo] NVARCHAR(50) NOT NULL,
        [nombre] NVARCHAR(150) NOT NULL,
        [descripcion] NVARCHAR(500),
        [activo] BIT NOT NULL CONSTRAINT [clientes_tipos_activo_df] DEFAULT 1,
        [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [clientes_tipos_fecha_creacion_df]
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [clientes_tipos_fecha_actualizacion_df]
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        CONSTRAINT [clientes_tipos_pkey] PRIMARY KEY CLUSTERED ([tipo_cliente_id]),
        CONSTRAINT [clientes_tipos_codigo_key] UNIQUE NONCLUSTERED ([codigo])
    );

    CREATE TABLE [dbo].[proveedores_tipos] (
        [tipo_proveedor_id] INT NOT NULL IDENTITY(1,1),
        [codigo] NVARCHAR(50) NOT NULL,
        [nombre] NVARCHAR(150) NOT NULL,
        [descripcion] NVARCHAR(500),
        [activo] BIT NOT NULL CONSTRAINT [proveedores_tipos_activo_df] DEFAULT 1,
        [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_tipos_fecha_creacion_df]
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_tipos_fecha_actualizacion_df]
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        CONSTRAINT [proveedores_tipos_pkey] PRIMARY KEY CLUSTERED ([tipo_proveedor_id]),
        CONSTRAINT [proveedores_tipos_codigo_key] UNIQUE NONCLUSTERED ([codigo])
    );

    CREATE NONCLUSTERED INDEX [clientes_tipos_activo_idx]
        ON [dbo].[clientes_tipos]([activo]);
    CREATE NONCLUSTERED INDEX [proveedores_tipos_activo_idx]
        ON [dbo].[proveedores_tipos]([activo]);

    INSERT INTO [dbo].[clientes_tipos] ([codigo], [nombre], [descripcion])
    VALUES
        (N'PERSONA_INDIVIDUAL', N'Persona individual', NULL),
        (N'PERSONA_JURIDICA', N'Persona jurídica', NULL);

    INSERT INTO [dbo].[proveedores_tipos] ([codigo], [nombre], [descripcion])
    VALUES
        (N'PERSONA_INDIVIDUAL', N'Persona individual', NULL),
        (N'PERSONA_JURIDICA', N'Persona jurídica', NULL);

    -- ======================================================
    -- CÓDIGOS GENERADOS POR SQL SERVER
    -- ======================================================

    CREATE SEQUENCE [dbo].[clientes_codigo_seq]
        AS INT START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;
    CREATE SEQUENCE [dbo].[proveedores_codigo_seq]
        AS INT START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;

    ALTER TABLE [dbo].[clientes_registros]
        ADD [codigo] NVARCHAR(9) NULL
                CONSTRAINT [clientes_registros_codigo_df]
                DEFAULT (N'CLI'+RIGHT(N'000000'+CONVERT([nvarchar](6),NEXT VALUE FOR [dbo].[clientes_codigo_seq]),(6))),
            [tipo_cliente_id] INT NULL;
    ALTER TABLE [dbo].[proveedores_registros]
        ADD [codigo] NVARCHAR(9) NULL
                CONSTRAINT [proveedores_registros_codigo_df]
                DEFAULT (N'PRO'+RIGHT(N'000000'+CONVERT([nvarchar](6),NEXT VALUE FOR [dbo].[proveedores_codigo_seq]),(6))),
            [tipo_proveedor_id] INT NULL;

    -- SQL dinámico limita la compilación de estas referencias hasta después
    -- de que las columnas nuevas existan físicamente en el mismo batch.
    EXEC sp_executesql N'UPDATE [dbo].[clientes_registros] SET [codigo] = DEFAULT WHERE [codigo] IS NULL;';
    EXEC sp_executesql N'UPDATE [dbo].[proveedores_registros] SET [codigo] = DEFAULT WHERE [codigo] IS NULL;';

    EXEC sp_executesql N'
        UPDATE [cliente]
        SET [tipo_cliente_id] = [tipo].[tipo_cliente_id]
        FROM [dbo].[clientes_registros] AS [cliente]
        INNER JOIN [dbo].[clientes_tipos] AS [tipo]
            ON [tipo].[codigo] = UPPER(REPLACE(LTRIM(RTRIM([cliente].[tipo_cliente])), N'' '', N''_''));';

    EXEC sp_executesql N'
        UPDATE [proveedor]
        SET [tipo_proveedor_id] = [tipo].[tipo_proveedor_id]
        FROM [dbo].[proveedores_registros] AS [proveedor]
        INNER JOIN [dbo].[proveedores_tipos] AS [tipo]
            ON [tipo].[codigo] = UPPER(REPLACE(LTRIM(RTRIM([proveedor].[tipo_proveedor])), N'' '', N''_''));';

    -- La representación canónica se almacena directamente.
    UPDATE [dbo].[clientes_registros]
    SET [nit] = NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N''),
        [numero_documento] = NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'');

    UPDATE [dbo].[proveedores_registros]
    SET [nit] = NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N''),
        [numero_documento] = NULLIF(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N' ', N''), N'-', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N'')), N'');

    EXEC sp_executesql N'
        IF EXISTS (SELECT 1 FROM [dbo].[clientes_registros] WHERE [codigo] IS NULL OR [tipo_cliente_id] IS NULL)
            THROW 51019, N''No fue posible completar la migración de Clientes.'', 1;';
    EXEC sp_executesql N'
        IF EXISTS (SELECT 1 FROM [dbo].[proveedores_registros] WHERE [codigo] IS NULL OR [tipo_proveedor_id] IS NULL)
            THROW 51020, N''No fue posible completar la migración de Proveedores.'', 1;';

    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros] ALTER COLUMN [codigo] NVARCHAR(9) NOT NULL;';
    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros] ALTER COLUMN [tipo_cliente_id] INT NOT NULL;';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros] ALTER COLUMN [codigo] NVARCHAR(9) NOT NULL;';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros] ALTER COLUMN [tipo_proveedor_id] INT NOT NULL;';

    -- ======================================================
    -- INTEGRIDAD RELACIONAL Y DE FORMATO
    -- ======================================================

    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros]
        ADD CONSTRAINT [clientes_registros_codigo_key] UNIQUE NONCLUSTERED ([codigo]);';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros]
        ADD CONSTRAINT [proveedores_registros_codigo_key] UNIQUE NONCLUSTERED ([codigo]);';

    EXEC sp_executesql N'CREATE NONCLUSTERED INDEX [clientes_registros_tipo_cliente_id_idx]
        ON [dbo].[clientes_registros]([tipo_cliente_id]);';
    EXEC sp_executesql N'CREATE NONCLUSTERED INDEX [proveedores_registros_tipo_proveedor_id_idx]
        ON [dbo].[proveedores_registros]([tipo_proveedor_id]);';

    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros]
        ADD CONSTRAINT [clientes_registros_tipo_cliente_id_fkey]
        FOREIGN KEY ([tipo_cliente_id]) REFERENCES [dbo].[clientes_tipos]([tipo_cliente_id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros]
        ADD CONSTRAINT [proveedores_registros_tipo_proveedor_id_fkey]
        FOREIGN KEY ([tipo_proveedor_id]) REFERENCES [dbo].[proveedores_tipos]([tipo_proveedor_id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;';

    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros]
        ADD CONSTRAINT [CK_clientes_registros_codigo]
        CHECK (LEN([codigo]) = 9 AND LEFT([codigo], 3) = N''CLI'' AND SUBSTRING([codigo], 4, 6) NOT LIKE N''%[^0-9]%'');';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros]
        ADD CONSTRAINT [CK_proveedores_registros_codigo]
        CHECK (LEN([codigo]) = 9 AND LEFT([codigo], 3) = N''PRO'' AND SUBSTRING([codigo], 4, 6) NOT LIKE N''%[^0-9]%'');';

    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros]
        ADD CONSTRAINT [CK_clientes_registros_nit_canonico]
        CHECK ([nit] IS NULL OR (
            DATALENGTH([nit]) > 0
            AND DATALENGTH([nit]) = DATALENGTH(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')))
            AND [nit] COLLATE Latin1_General_100_BIN2 = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')) COLLATE Latin1_General_100_BIN2
        ));';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros]
        ADD CONSTRAINT [CK_proveedores_registros_nit_canonico]
        CHECK ([nit] IS NULL OR (
            DATALENGTH([nit]) > 0 AND [nit] <> N''CF''
            AND DATALENGTH([nit]) = DATALENGTH(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')))
            AND [nit] COLLATE Latin1_General_100_BIN2 = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([nit])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')) COLLATE Latin1_General_100_BIN2
        ));';
    EXEC sp_executesql N'ALTER TABLE [dbo].[clientes_registros]
        ADD CONSTRAINT [CK_clientes_registros_documento_canonico]
        CHECK ([numero_documento] IS NULL OR (
            DATALENGTH([numero_documento]) > 0 AND [numero_documento] <> N''CF''
            AND DATALENGTH([numero_documento]) = DATALENGTH(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')))
            AND [numero_documento] COLLATE Latin1_General_100_BIN2 = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')) COLLATE Latin1_General_100_BIN2
        ));';
    EXEC sp_executesql N'ALTER TABLE [dbo].[proveedores_registros]
        ADD CONSTRAINT [CK_proveedores_registros_documento_canonico]
        CHECK ([numero_documento] IS NULL OR (
            DATALENGTH([numero_documento]) > 0 AND [numero_documento] <> N''CF''
            AND DATALENGTH([numero_documento]) = DATALENGTH(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')))
            AND [numero_documento] COLLATE Latin1_General_100_BIN2 = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([numero_documento])), N'' '', N''''), N''-'', N''''), NCHAR(9), N''''), NCHAR(10), N''''), NCHAR(13), N'''')) COLLATE Latin1_General_100_BIN2
        ));';

    EXEC sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UX_clientes_registros_nit]
        ON [dbo].[clientes_registros]([nit]) WHERE [nit] IS NOT NULL AND [nit] <> N''CF'';';
    EXEC sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UX_proveedores_registros_nit]
        ON [dbo].[proveedores_registros]([nit]) WHERE [nit] IS NOT NULL;';
    EXEC sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UX_clientes_registros_numero_documento]
        ON [dbo].[clientes_registros]([numero_documento]) WHERE [numero_documento] IS NOT NULL;';
    EXEC sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UX_proveedores_registros_numero_documento]
        ON [dbo].[proveedores_registros]([numero_documento]) WHERE [numero_documento] IS NOT NULL;';

    ALTER TABLE [dbo].[clientes_registros] DROP COLUMN [tipo_cliente];
    ALTER TABLE [dbo].[proveedores_registros] DROP COLUMN [tipo_proveedor];

    IF OBJECT_ID(N'dbo.clientes_tipos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.proveedores_tipos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.clientes_codigo_seq', N'SO') IS NULL
       OR OBJECT_ID(N'dbo.proveedores_codigo_seq', N'SO') IS NULL
        THROW 51021, N'No fue posible verificar los objetos estructurales.', 1;

    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;
