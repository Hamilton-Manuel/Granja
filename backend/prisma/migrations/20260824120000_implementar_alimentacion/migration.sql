BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.alimentacion_registros)
        THROW 51000, N'La migración de Alimentación requiere revisar registros históricos antes de transformar su fuente física.', 1;

    IF EXISTS (SELECT 1 FROM dbo.alimentacion_detalles)
        THROW 51001, N'Existen detalles históricos de Alimentación sin fuente física inequívoca.', 1;

    ALTER TABLE dbo.alimentacion_detalles
        DROP CONSTRAINT alimentacion_detalles_alimentacion_id_producto_id_key;

    DROP INDEX alimentacion_registros_fecha_alimentacion_idx ON dbo.alimentacion_registros;
    ALTER TABLE dbo.alimentacion_registros ALTER COLUMN formula_id INT NULL;
    ALTER TABLE dbo.alimentacion_registros ALTER COLUMN fecha_alimentacion DATETIME2(7) NOT NULL;
    ALTER TABLE dbo.alimentacion_registros ALTER COLUMN cantidad_suministrada DECIMAL(18,4) NULL;
    ALTER TABLE dbo.alimentacion_registros ALTER COLUMN unidad_medida NVARCHAR(30) NULL;
    ALTER TABLE dbo.alimentacion_registros ADD
        estado NVARCHAR(20) NOT NULL CONSTRAINT alimentacion_registros_estado_df DEFAULT N'CONFIRMADA',
        usuario_reversion_id INT NULL,
        fecha_reversion DATETIME2(7) NULL,
        motivo_reversion NVARCHAR(500) NULL;

    ALTER TABLE dbo.alimentacion_detalles ADD
        inventario_id INT NULL,
        existencia_lote_id INT NULL;

    ALTER TABLE dbo.inventario_existencias ADD
        costo_promedio_actual DECIMAL(18,4) NULL;

    CREATE TABLE dbo.alimentacion_productos_habilitados (
        producto_id INT NOT NULL,
        activo BIT NOT NULL CONSTRAINT alimentacion_productos_habilitados_activo_df DEFAULT 1,
        fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT alimentacion_productos_habilitados_fecha_creacion_df
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT alimentacion_productos_habilitados_fecha_actualizacion_df
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        CONSTRAINT alimentacion_productos_habilitados_pkey PRIMARY KEY (producto_id),
        CONSTRAINT alimentacion_productos_habilitados_producto_id_fkey FOREIGN KEY (producto_id)
            REFERENCES dbo.inventario_productos(producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    ALTER TABLE dbo.produccion_eventos ADD alimentacion_id INT NULL;

    ALTER TABLE dbo.inventario_existencias_lotes ADD CONSTRAINT
        inventario_existencias_lotes_existencia_lote_id_producto_id_key UNIQUE (existencia_lote_id, producto_id);

    EXEC sys.sp_executesql N'ALTER TABLE dbo.alimentacion_registros ADD CONSTRAINT alimentacion_registros_usuario_reversion_id_fkey FOREIGN KEY (usuario_reversion_id) REFERENCES dbo.usuarios_cuentas(usuario_id) ON DELETE NO ACTION ON UPDATE NO ACTION';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.alimentacion_detalles ADD CONSTRAINT alimentacion_detalles_inventario_id_producto_id_fkey FOREIGN KEY (inventario_id, producto_id) REFERENCES dbo.inventario_existencias(inventario_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.alimentacion_detalles ADD CONSTRAINT alimentacion_detalles_existencia_lote_id_producto_id_fkey FOREIGN KEY (existencia_lote_id, producto_id) REFERENCES dbo.inventario_existencias_lotes(existencia_lote_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT produccion_eventos_alimentacion_id_fkey FOREIGN KEY (alimentacion_id) REFERENCES dbo.alimentacion_registros(alimentacion_id) ON DELETE NO ACTION ON UPDATE NO ACTION';

    EXEC sys.sp_executesql N'ALTER TABLE dbo.alimentacion_registros ADD CONSTRAINT CK_alimentacion_registros_estado_reversion CHECK (
        (estado=N''CONFIRMADA'' AND usuario_reversion_id IS NULL AND fecha_reversion IS NULL AND motivo_reversion IS NULL) OR
        (estado=N''REVERTIDA'' AND usuario_reversion_id IS NOT NULL AND fecha_reversion IS NOT NULL AND motivo_reversion IS NOT NULL)
    )';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.alimentacion_detalles ADD CONSTRAINT CK_alimentacion_detalles_fuente CHECK (
        (inventario_id IS NOT NULL AND existencia_lote_id IS NULL) OR
        (inventario_id IS NULL AND existencia_lote_id IS NOT NULL)
    )';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.inventario_existencias ADD CONSTRAINT CK_inventario_existencias_costo_promedio CHECK (
        costo_promedio_actual IS NULL OR costo_promedio_actual >= 0
    )';

    EXEC sys.sp_executesql N'CREATE UNIQUE INDEX UX_alimentacion_detalles_fuente_sin_lote
        ON dbo.alimentacion_detalles(alimentacion_id, producto_id, inventario_id)
        WHERE inventario_id IS NOT NULL';
    EXEC sys.sp_executesql N'CREATE UNIQUE INDEX UX_alimentacion_detalles_fuente_lote
        ON dbo.alimentacion_detalles(alimentacion_id, producto_id, existencia_lote_id)
        WHERE existencia_lote_id IS NOT NULL';
    CREATE INDEX IX_alimentacion_productos_habilitados_activo ON dbo.alimentacion_productos_habilitados(activo);
    EXEC sys.sp_executesql N'CREATE INDEX IX_alimentacion_registros_estado_fecha ON dbo.alimentacion_registros(estado, fecha_alimentacion)';
    EXEC sys.sp_executesql N'CREATE INDEX alimentacion_registros_fecha_alimentacion_idx ON dbo.alimentacion_registros(fecha_alimentacion)';
    EXEC sys.sp_executesql N'CREATE INDEX IX_alimentacion_detalles_inventario ON dbo.alimentacion_detalles(inventario_id)';
    EXEC sys.sp_executesql N'CREATE INDEX IX_alimentacion_detalles_existencia_lote ON dbo.alimentacion_detalles(existencia_lote_id)';
    EXEC sys.sp_executesql N'CREATE INDEX IX_produccion_eventos_alimentacion ON dbo.produccion_eventos(alimentacion_id)';

    ALTER TABLE dbo.produccion_eventos DROP CONSTRAINT CK_produccion_eventos_referencia;
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT CK_produccion_eventos_referencia CHECK (
        (tipo_evento=N''MEDICION'' AND medicion_id IS NOT NULL AND historial_estado_id IS NULL AND operacion_produccion_id IS NULL AND alimentacion_id IS NULL) OR
        (tipo_evento=N''CAMBIO_ESTADO'' AND medicion_id IS NULL AND historial_estado_id IS NOT NULL AND operacion_produccion_id IS NOT NULL AND alimentacion_id IS NULL) OR
        (tipo_evento=N''CAMBIO_LOTE'' AND medicion_id IS NULL AND historial_estado_id IS NULL AND operacion_produccion_id IS NOT NULL AND alimentacion_id IS NULL) OR
        (tipo_evento=N''ALIMENTACION'' AND medicion_id IS NULL AND historial_estado_id IS NULL AND operacion_produccion_id IS NULL AND alimentacion_id IS NOT NULL) OR
        (tipo_evento=N''APLICACION_SANITARIA'' AND medicion_id IS NULL AND historial_estado_id IS NULL AND alimentacion_id IS NULL)
    )';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
