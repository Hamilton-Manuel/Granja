SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM dbo.produccion_lotes
        UNION ALL SELECT 1 FROM dbo.produccion_animales
        UNION ALL SELECT 1 FROM dbo.produccion_asignaciones_lotes
        UNION ALL SELECT 1 FROM dbo.produccion_historial_estados
        UNION ALL SELECT 1 FROM dbo.produccion_mediciones
        UNION ALL SELECT 1 FROM dbo.produccion_transacciones
        UNION ALL SELECT 1 FROM dbo.produccion_eventos
    )
        THROW 51000, N'La migracion de Produccion requiere tablas operativas vacias; no se inferiran datos historicos.', 1;

    ALTER TABLE dbo.produccion_animales DROP CONSTRAINT produccion_animales_raza_id_fkey;
    ALTER TABLE dbo.produccion_asignaciones_lotes DROP CONSTRAINT produccion_asignaciones_lotes_animal_id_fkey;
    ALTER TABLE dbo.produccion_asignaciones_lotes DROP CONSTRAINT produccion_asignaciones_lotes_lote_produccion_id_fkey;
    ALTER TABLE dbo.produccion_transacciones DROP CONSTRAINT CK_produccion_transacciones_tipo;
    ALTER TABLE dbo.produccion_transacciones DROP CONSTRAINT CK_produccion_transacciones_cantidad;
    ALTER TABLE dbo.produccion_transacciones DROP CONSTRAINT CK_produccion_transacciones_venta_detalle;
    ALTER TABLE dbo.produccion_eventos DROP CONSTRAINT CK_produccion_eventos_destino;
    ALTER TABLE dbo.produccion_eventos DROP CONSTRAINT CK_produccion_eventos_tipo;
    ALTER TABLE dbo.produccion_eventos DROP CONSTRAINT CK_produccion_eventos_referencia;
    DROP INDEX produccion_eventos_referencia_tipo_referencia_id_idx ON dbo.produccion_eventos;

    ALTER TABLE dbo.produccion_lotes ADD tipo_animal_id INT NULL;
    ALTER TABLE dbo.produccion_lotes ALTER COLUMN tipo_animal_id INT NOT NULL;
    ALTER TABLE dbo.produccion_animales ADD madre_animal_id INT NULL;
    ALTER TABLE dbo.produccion_asignaciones_lotes ADD tipo_animal_id INT NULL;
    ALTER TABLE dbo.produccion_asignaciones_lotes ALTER COLUMN tipo_animal_id INT NOT NULL;
    ALTER TABLE dbo.produccion_transacciones ADD operacion_produccion_id INT NULL;
    ALTER TABLE dbo.produccion_eventos DROP COLUMN referencia_tipo, referencia_id;
    ALTER TABLE dbo.produccion_eventos ADD operacion_produccion_id INT NULL, medicion_id INT NULL, historial_estado_id INT NULL;

    CREATE TABLE dbo.produccion_operaciones (
        operacion_produccion_id INT IDENTITY(1,1) NOT NULL,
        usuario_id INT NOT NULL,
        proveedor_id INT NULL,
        lote_produccion_id INT NULL,
        operacion_revertida_id INT NULL,
        tipo_operacion NVARCHAR(30) NOT NULL,
        subtipo_operacion NVARCHAR(40) NOT NULL,
        documento_referencia NVARCHAR(150) NULL,
        motivo NVARCHAR(500) NULL,
        observaciones NVARCHAR(1000) NULL,
        fecha_operacion DATETIME2(7) NOT NULL CONSTRAINT produccion_operaciones_fecha_operacion_df
            DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        CONSTRAINT produccion_operaciones_pkey PRIMARY KEY CLUSTERED (operacion_produccion_id)
    );

    CREATE TABLE dbo.produccion_operaciones_animales (
        operacion_animal_id INT IDENTITY(1,1) NOT NULL,
        operacion_produccion_id INT NOT NULL,
        animal_id INT NOT NULL,
        costo_adquisicion DECIMAL(18,2) NULL,
        CONSTRAINT produccion_operaciones_animales_pkey PRIMARY KEY CLUSTERED (operacion_animal_id),
        CONSTRAINT produccion_operaciones_animales_operacion_animal_key UNIQUE (operacion_produccion_id, animal_id),
        CONSTRAINT CK_produccion_operaciones_animales_costo CHECK (costo_adquisicion IS NULL OR costo_adquisicion >= 0)
    );

    ALTER TABLE dbo.produccion_transacciones ALTER COLUMN operacion_produccion_id INT NOT NULL;

    CREATE UNIQUE INDEX produccion_razas_raza_id_tipo_animal_id_key ON dbo.produccion_razas(raza_id, tipo_animal_id);
    CREATE UNIQUE INDEX produccion_lotes_lote_produccion_id_tipo_animal_id_key ON dbo.produccion_lotes(lote_produccion_id, tipo_animal_id);
    CREATE UNIQUE INDEX produccion_animales_animal_id_tipo_animal_id_key ON dbo.produccion_animales(animal_id, tipo_animal_id);
    CREATE UNIQUE INDEX UX_produccion_operaciones_reversion ON dbo.produccion_operaciones(operacion_revertida_id) WHERE operacion_revertida_id IS NOT NULL;
    CREATE INDEX produccion_lotes_tipo_animal_id_idx ON dbo.produccion_lotes(tipo_animal_id);
    CREATE INDEX produccion_animales_madre_animal_id_idx ON dbo.produccion_animales(madre_animal_id);
    CREATE INDEX produccion_asignaciones_lotes_tipo_animal_id_idx ON dbo.produccion_asignaciones_lotes(tipo_animal_id);
    CREATE INDEX produccion_operaciones_usuario_id_idx ON dbo.produccion_operaciones(usuario_id);
    CREATE INDEX produccion_operaciones_proveedor_id_idx ON dbo.produccion_operaciones(proveedor_id);
    CREATE INDEX produccion_operaciones_lote_produccion_id_idx ON dbo.produccion_operaciones(lote_produccion_id);
    CREATE INDEX produccion_operaciones_tipo_operacion_idx ON dbo.produccion_operaciones(tipo_operacion);
    CREATE INDEX produccion_operaciones_subtipo_operacion_idx ON dbo.produccion_operaciones(subtipo_operacion);
    CREATE INDEX produccion_operaciones_fecha_operacion_idx ON dbo.produccion_operaciones(fecha_operacion);
    CREATE INDEX produccion_operaciones_animales_animal_id_idx ON dbo.produccion_operaciones_animales(animal_id);
    CREATE INDEX produccion_transacciones_operacion_produccion_id_idx ON dbo.produccion_transacciones(operacion_produccion_id);
    CREATE INDEX produccion_eventos_operacion_produccion_id_idx ON dbo.produccion_eventos(operacion_produccion_id);
    CREATE INDEX produccion_eventos_medicion_id_idx ON dbo.produccion_eventos(medicion_id);
    CREATE INDEX produccion_eventos_historial_estado_id_idx ON dbo.produccion_eventos(historial_estado_id);

    ALTER TABLE dbo.produccion_lotes ADD CONSTRAINT produccion_lotes_tipo_animal_id_fkey FOREIGN KEY(tipo_animal_id) REFERENCES dbo.produccion_tipos_animales(tipo_animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_animales ADD CONSTRAINT produccion_animales_raza_tipo_fkey FOREIGN KEY(raza_id, tipo_animal_id) REFERENCES dbo.produccion_razas(raza_id, tipo_animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_animales ADD CONSTRAINT produccion_animales_madre_animal_id_fkey FOREIGN KEY(madre_animal_id) REFERENCES dbo.produccion_animales(animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;';
    ALTER TABLE dbo.produccion_asignaciones_lotes ADD CONSTRAINT produccion_asignaciones_lotes_animal_tipo_fkey FOREIGN KEY(animal_id, tipo_animal_id) REFERENCES dbo.produccion_animales(animal_id, tipo_animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_asignaciones_lotes ADD CONSTRAINT produccion_asignaciones_lotes_lote_tipo_fkey FOREIGN KEY(lote_produccion_id, tipo_animal_id) REFERENCES dbo.produccion_lotes(lote_produccion_id, tipo_animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT produccion_operaciones_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES dbo.usuarios_cuentas(usuario_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT produccion_operaciones_proveedor_id_fkey FOREIGN KEY(proveedor_id) REFERENCES dbo.proveedores_registros(proveedor_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT produccion_operaciones_lote_produccion_id_fkey FOREIGN KEY(lote_produccion_id) REFERENCES dbo.produccion_lotes(lote_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT produccion_operaciones_operacion_revertida_id_fkey FOREIGN KEY(operacion_revertida_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones_animales ADD CONSTRAINT produccion_operaciones_animales_operacion_id_fkey FOREIGN KEY(operacion_produccion_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_operaciones_animales ADD CONSTRAINT produccion_operaciones_animales_animal_id_fkey FOREIGN KEY(animal_id) REFERENCES dbo.produccion_animales(animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.produccion_transacciones ADD CONSTRAINT produccion_transacciones_operacion_id_fkey FOREIGN KEY(operacion_produccion_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT produccion_eventos_operacion_id_fkey FOREIGN KEY(operacion_produccion_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT produccion_eventos_medicion_id_fkey FOREIGN KEY(medicion_id) REFERENCES dbo.produccion_mediciones(medicion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;';
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT produccion_eventos_historial_estado_id_fkey FOREIGN KEY(historial_estado_id) REFERENCES dbo.produccion_historial_estados(historial_estado_id) ON DELETE NO ACTION ON UPDATE NO ACTION;';

    ALTER TABLE dbo.produccion_lotes ADD CONSTRAINT CK_produccion_lotes_estado CHECK (estado IN (N'ACTIVO', N'CERRADO'));
    ALTER TABLE dbo.produccion_lotes ADD CONSTRAINT CK_produccion_lotes_fechas CHECK ((estado=N'ACTIVO' AND fecha_cierre IS NULL) OR (estado=N'CERRADO' AND fecha_cierre IS NOT NULL AND fecha_cierre>=fecha_inicio));
    ALTER TABLE dbo.produccion_lotes ADD CONSTRAINT CK_produccion_lotes_codigo CHECK (codigo=UPPER(LTRIM(RTRIM(codigo))) AND codigo<>N'' AND codigo NOT LIKE N'% %');
    ALTER TABLE dbo.produccion_animales ADD CONSTRAINT CK_produccion_animales_identificacion CHECK (identificacion=UPPER(LTRIM(RTRIM(identificacion))) AND identificacion<>N'' AND identificacion NOT LIKE N'% %');
    ALTER TABLE dbo.produccion_animales ADD CONSTRAINT CK_produccion_animales_sexo CHECK (sexo IN (N'MACHO', N'HEMBRA', N'NO_DETERMINADO'));
    ALTER TABLE dbo.produccion_animales ADD CONSTRAINT CK_produccion_animales_estado CHECK (estado_actual IN (N'ACTIVO', N'VENDIDO', N'FALLECIDO', N'RETIRADO'));
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_animales ADD CONSTRAINT CK_produccion_animales_madre CHECK (madre_animal_id IS NULL OR madre_animal_id<>animal_id);';
    ALTER TABLE dbo.produccion_asignaciones_lotes ADD CONSTRAINT CK_produccion_asignaciones_estado_fechas CHECK ((estado=N'VIGENTE' AND fecha_fin IS NULL) OR (estado=N'FINALIZADA' AND fecha_fin IS NOT NULL AND fecha_fin>=fecha_inicio));
    ALTER TABLE dbo.produccion_mediciones ADD CONSTRAINT CK_produccion_mediciones_peso CHECK (tipo_medicion=N'PESO' AND unidad_medida=N'KG' AND valor>0 AND animal_id IS NOT NULL AND lote_produccion_id IS NULL);
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT CK_produccion_operaciones_tipo_subtipo CHECK (
        (tipo_operacion=N'INGRESO' AND subtipo_operacion IN (N'INICIAL',N'NACIMIENTO',N'COMPRA')) OR
        (tipo_operacion=N'TRASLADO' AND subtipo_operacion=N'TRASLADO') OR
        (tipo_operacion=N'CAMBIO_ESTADO' AND subtipo_operacion IN (N'FALLECIMIENTO',N'RETIRO')) OR
        (tipo_operacion=N'VENTA' AND subtipo_operacion=N'VENTA') OR
        (tipo_operacion=N'REVERSION' AND subtipo_operacion=N'REVERSION'));
    ALTER TABLE dbo.produccion_operaciones ADD CONSTRAINT CK_produccion_operaciones_compra CHECK ((subtipo_operacion=N'COMPRA' AND proveedor_id IS NOT NULL) OR (subtipo_operacion<>N'COMPRA' AND proveedor_id IS NULL));
    ALTER TABLE dbo.produccion_transacciones ADD CONSTRAINT CK_produccion_transacciones_tipo CHECK (tipo_transaccion IN (N'INGRESO',N'TRASLADO',N'BAJA',N'VENTA',N'REVERSION'));
    ALTER TABLE dbo.produccion_transacciones ADD CONSTRAINT CK_produccion_transacciones_cantidad CHECK (
        (tipo_transaccion=N'INGRESO' AND cantidad>0) OR
        (tipo_transaccion=N'TRASLADO' AND cantidad<>0) OR
        (tipo_transaccion IN (N'BAJA',N'VENTA') AND cantidad<0) OR
        (tipo_transaccion=N'REVERSION' AND cantidad<>0));
    ALTER TABLE dbo.produccion_transacciones ADD CONSTRAINT CK_produccion_transacciones_venta_detalle CHECK ((tipo_transaccion=N'VENTA' AND venta_detalle_id IS NOT NULL) OR (tipo_transaccion<>N'VENTA' AND venta_detalle_id IS NULL));
    ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT CK_produccion_eventos_destino CHECK ((animal_id IS NOT NULL AND lote_produccion_id IS NULL) OR (animal_id IS NULL AND lote_produccion_id IS NOT NULL));
    ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT CK_produccion_eventos_tipo CHECK (tipo_evento IN (N'MEDICION',N'ALIMENTACION',N'APLICACION_SANITARIA',N'CAMBIO_LOTE',N'CAMBIO_ESTADO'));
    EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT CK_produccion_eventos_referencia CHECK (
        (tipo_evento=N''MEDICION'' AND medicion_id IS NOT NULL AND historial_estado_id IS NULL AND operacion_produccion_id IS NULL) OR
        (tipo_evento=N''CAMBIO_ESTADO'' AND medicion_id IS NULL AND historial_estado_id IS NOT NULL AND operacion_produccion_id IS NOT NULL) OR
        (tipo_evento=N''CAMBIO_LOTE'' AND medicion_id IS NULL AND historial_estado_id IS NULL AND operacion_produccion_id IS NOT NULL) OR
        (tipo_evento IN (N''ALIMENTACION'',N''APLICACION_SANITARIA'') AND medicion_id IS NULL AND historial_estado_id IS NULL));';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
