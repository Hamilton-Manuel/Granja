SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.ventas_registros)
       OR EXISTS (SELECT 1 FROM dbo.ventas_detalles)
       OR EXISTS (SELECT 1 FROM dbo.ventas_recibos)
        THROW 51000, N'La migracion de Ventas requiere tablas de Ventas vacias; no se inventaran animales para cantidades historicas.', 1;

    ALTER TABLE dbo.ventas_registros DROP CONSTRAINT CK_ventas_registros_montos;
    ALTER TABLE dbo.ventas_registros DROP CONSTRAINT CK_ventas_registros_estado;
    ALTER TABLE dbo.ventas_detalles DROP CONSTRAINT CK_ventas_detalles_valores;
    ALTER TABLE dbo.ventas_recibos DROP CONSTRAINT ventas_recibos_numero_recibo_key;
    ALTER TABLE dbo.ventas_detalles DROP CONSTRAINT ventas_detalles_venta_id_lote_produccion_id_key;

    DECLARE @dfEstado sysname = (SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.default_object_id=dc.object_id WHERE dc.parent_object_id=OBJECT_ID(N'dbo.ventas_registros') AND c.name=N'estado');
    IF @dfEstado IS NOT NULL EXEC(N'ALTER TABLE dbo.ventas_registros DROP CONSTRAINT ['+@dfEstado+N']');
    DECLARE @dfDescuento sysname = (SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.default_object_id=dc.object_id WHERE dc.parent_object_id=OBJECT_ID(N'dbo.ventas_registros') AND c.name=N'descuento');
    IF @dfDescuento IS NOT NULL EXEC(N'ALTER TABLE dbo.ventas_registros DROP CONSTRAINT ['+@dfDescuento+N']');

    ALTER TABLE dbo.ventas_registros DROP COLUMN descuento;
    ALTER TABLE dbo.ventas_detalles DROP COLUMN precio_unitario;
    ALTER TABLE dbo.ventas_recibos DROP COLUMN numero_recibo;

    CREATE SEQUENCE dbo.ventas_recibos_numero_seq AS INT START WITH 1 INCREMENT BY 1 NO CYCLE;

    ALTER TABLE dbo.ventas_registros ADD
        operacion_produccion_id INT NOT NULL,
        operacion_anulacion_id INT NULL,
        usuario_anulacion_id INT NULL,
        cliente_codigo NVARCHAR(9) NOT NULL,
        cliente_nombre NVARCHAR(200) NOT NULL,
        cliente_nit NVARCHAR(20) NULL,
        documento_referencia NVARCHAR(150) NULL,
        fecha_anulacion DATETIME2(7) NULL,
        motivo_anulacion NVARCHAR(500) NULL;
    ALTER TABLE dbo.ventas_registros ADD CONSTRAINT ventas_registros_estado_df DEFAULT N'CONFIRMADA' FOR estado;

    ALTER TABLE dbo.ventas_recibos ADD
        serie NVARCHAR(10) NOT NULL CONSTRAINT ventas_recibos_serie_df DEFAULT N'A',
        numero INT NOT NULL CONSTRAINT ventas_recibos_numero_df DEFAULT NEXT VALUE FOR dbo.ventas_recibos_numero_seq;

    CREATE TABLE dbo.ventas_detalles_animales (
        detalle_venta_animal_id INT IDENTITY(1,1) NOT NULL,
        detalle_venta_id INT NOT NULL,
        animal_id INT NOT NULL,
        asignacion_lote_id INT NOT NULL,
        lote_produccion_id INT NOT NULL,
        precio_venta DECIMAL(18,2) NOT NULL,
        fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT ventas_detalles_animales_fecha_creacion_df DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
        CONSTRAINT ventas_detalles_animales_pkey PRIMARY KEY CLUSTERED (detalle_venta_animal_id),
        CONSTRAINT CK_ventas_detalles_animales_precio CHECK (precio_venta > 0)
    );

    CREATE UNIQUE INDEX ventas_asignaciones_asignacion_animal_lote_key ON dbo.produccion_asignaciones_lotes(asignacion_lote_id,animal_id,lote_produccion_id);
    CREATE UNIQUE INDEX ventas_detalles_venta_lote_key ON dbo.ventas_detalles(venta_id,lote_produccion_id);
    CREATE UNIQUE INDEX ventas_detalles_detalle_lote_key ON dbo.ventas_detalles(detalle_venta_id,lote_produccion_id);
    CREATE UNIQUE INDEX ventas_detalles_animales_asignacion_key ON dbo.ventas_detalles_animales(asignacion_lote_id);
    CREATE UNIQUE INDEX ventas_detalles_animales_detalle_animal_key ON dbo.ventas_detalles_animales(detalle_venta_id,animal_id);
    EXEC(N'CREATE UNIQUE INDEX ventas_registros_operacion_key ON dbo.ventas_registros(operacion_produccion_id)');
    EXEC(N'CREATE UNIQUE INDEX UX_ventas_registros_operacion_anulacion ON dbo.ventas_registros(operacion_anulacion_id) WHERE operacion_anulacion_id IS NOT NULL');
    EXEC(N'CREATE UNIQUE INDEX ventas_recibos_serie_numero_key ON dbo.ventas_recibos(serie,numero)');
    EXEC(N'CREATE INDEX ventas_registros_usuario_anulacion_id_idx ON dbo.ventas_registros(usuario_anulacion_id)');
    CREATE INDEX ventas_detalles_animales_animal_id_idx ON dbo.ventas_detalles_animales(animal_id);
    CREATE INDEX ventas_detalles_animales_lote_produccion_id_idx ON dbo.ventas_detalles_animales(lote_produccion_id);
    EXEC(N'CREATE INDEX ventas_recibos_serie_numero_idx ON dbo.ventas_recibos(serie,numero)');

    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT ventas_registros_operacion_id_fkey FOREIGN KEY(operacion_produccion_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT ventas_registros_operacion_anulacion_id_fkey FOREIGN KEY(operacion_anulacion_id) REFERENCES dbo.produccion_operaciones(operacion_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT ventas_registros_usuario_anulacion_id_fkey FOREIGN KEY(usuario_anulacion_id) REFERENCES dbo.usuarios_cuentas(usuario_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
    ALTER TABLE dbo.ventas_detalles_animales ADD CONSTRAINT ventas_detalles_animales_detalle_lote_fkey FOREIGN KEY(detalle_venta_id,lote_produccion_id) REFERENCES dbo.ventas_detalles(detalle_venta_id,lote_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.ventas_detalles_animales ADD CONSTRAINT ventas_detalles_animales_animal_id_fkey FOREIGN KEY(animal_id) REFERENCES dbo.produccion_animales(animal_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.ventas_detalles_animales ADD CONSTRAINT ventas_detalles_animales_asignacion_fkey FOREIGN KEY(asignacion_lote_id,animal_id,lote_produccion_id) REFERENCES dbo.produccion_asignaciones_lotes(asignacion_lote_id,animal_id,lote_produccion_id) ON DELETE NO ACTION ON UPDATE NO ACTION;

    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT CK_ventas_registros_montos CHECK (subtotal > 0 AND total = subtotal)');
    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT CK_ventas_registros_estado_anulacion CHECK (
        (estado=N''CONFIRMADA'' AND operacion_anulacion_id IS NULL AND usuario_anulacion_id IS NULL AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
        OR (estado=N''ANULADA'' AND operacion_anulacion_id IS NOT NULL AND usuario_anulacion_id IS NOT NULL AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL AND LTRIM(RTRIM(motivo_anulacion))<>N'''')
    )');
    ALTER TABLE dbo.ventas_registros ADD CONSTRAINT CK_ventas_registros_forma_pago CHECK (forma_pago IN (N'EFECTIVO',N'TRANSFERENCIA',N'DEPOSITO',N'CREDITO'));
    EXEC(N'ALTER TABLE dbo.ventas_registros ADD CONSTRAINT CK_ventas_registros_snapshot CHECK (LTRIM(RTRIM(cliente_codigo))<>N'''' AND LTRIM(RTRIM(cliente_nombre))<>N'''')');
    ALTER TABLE dbo.ventas_detalles ADD CONSTRAINT CK_ventas_detalles_valores CHECK (cantidad_animales > 0 AND subtotal > 0);
    EXEC(N'ALTER TABLE dbo.ventas_recibos ADD CONSTRAINT CK_ventas_recibos_serie_numero CHECK (LTRIM(RTRIM(serie))<>N'''' AND numero > 0)');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
