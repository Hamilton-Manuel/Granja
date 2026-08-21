BEGIN TRY
BEGIN TRAN;

/* Esta transformación no infiere códigos de almacén ni subtipos históricos. */
IF EXISTS (SELECT 1 FROM dbo.inventario_almacenes)
 OR EXISTS (SELECT 1 FROM dbo.inventario_existencias)
 OR EXISTS (SELECT 1 FROM dbo.inventario_lotes)
 OR EXISTS (SELECT 1 FROM dbo.inventario_transacciones)
BEGIN
    THROW 51000, N'La migración de Inventario requiere revisión manual porque existen datos históricos sin clasificación inequívoca.', 1;
END;

ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT CK_inventario_transacciones_cantidad;
ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT CK_inventario_transacciones_tipo_cantidad;
ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT CK_inventario_transacciones_tipo;
ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT CK_inventario_transacciones_costo;
ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT inventario_transacciones_lote_inventario_id_fkey;
DROP INDEX inventario_transacciones_lote_inventario_id_idx ON dbo.inventario_transacciones;

ALTER TABLE dbo.inventario_lotes DROP CONSTRAINT inventario_lotes_inventario_producto_id_fkey;
DROP INDEX inventario_lotes_inventario_producto_id_idx ON dbo.inventario_lotes;

ALTER TABLE dbo.inventario_almacenes ADD codigo NVARCHAR(50) NOT NULL;
ALTER TABLE dbo.inventario_lotes ADD producto_id INT NOT NULL;
ALTER TABLE dbo.inventario_lotes DROP CONSTRAINT inventario_lotes_existencia_actual_df;
ALTER TABLE dbo.inventario_lotes DROP COLUMN existencia_actual, inventario_producto_id;
ALTER TABLE dbo.inventario_transacciones DROP COLUMN lote_inventario_id;
ALTER TABLE dbo.inventario_transacciones ADD
    existencia_lote_id INT NULL,
    transferencia_id INT NULL,
    transaccion_revertida_id INT NULL,
    subtipo_transaccion NVARCHAR(40) NOT NULL;

CREATE TABLE dbo.inventario_existencias_lotes (
    existencia_lote_id INT IDENTITY(1,1) NOT NULL,
    inventario_producto_id INT NOT NULL,
    lote_inventario_id INT NOT NULL,
    producto_id INT NOT NULL,
    existencia_actual DECIMAL(18,4) NOT NULL CONSTRAINT inventario_existencias_lotes_existencia_actual_df DEFAULT 0,
    fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT inventario_existencias_lotes_fecha_creacion_df DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT inventario_existencias_lotes_fecha_actualizacion_df DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT inventario_existencias_lotes_pkey PRIMARY KEY CLUSTERED (existencia_lote_id),
    CONSTRAINT inventario_existencias_lotes_inventario_producto_id_lote_inventario_id_key UNIQUE (inventario_producto_id, lote_inventario_id),
    CONSTRAINT inventario_existencias_lotes_existencia_lote_id_inventario_producto_id_key UNIQUE (existencia_lote_id, inventario_producto_id),
    CONSTRAINT inventario_existencias_lotes_existencia_lote_id_inventario_producto_id_producto_id_key UNIQUE (existencia_lote_id, inventario_producto_id, producto_id),
    CONSTRAINT CK_inventario_existencias_lotes_no_negativa CHECK (existencia_actual >= 0)
);

CREATE TABLE dbo.inventario_transferencias (
    transferencia_id INT IDENTITY(1,1) NOT NULL,
    producto_id INT NOT NULL,
    inventario_producto_origen_id INT NOT NULL,
    inventario_producto_destino_id INT NOT NULL,
    existencia_lote_origen_id INT NULL,
    existencia_lote_destino_id INT NULL,
    lote_inventario_id INT NULL,
    usuario_id INT NOT NULL,
    cantidad DECIMAL(18,4) NOT NULL,
    documento_referencia NVARCHAR(150) NULL,
    motivo NVARCHAR(500) NULL,
    observaciones NVARCHAR(1000) NULL,
    fecha_transferencia DATETIME2(7) NOT NULL CONSTRAINT inventario_transferencias_fecha_transferencia_df DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT inventario_transferencias_pkey PRIMARY KEY CLUSTERED (transferencia_id),
    CONSTRAINT CK_inventario_transferencias_cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_inventario_transferencias_destinos CHECK (inventario_producto_origen_id <> inventario_producto_destino_id),
    CONSTRAINT CK_inventario_transferencias_lotes CHECK (
      (lote_inventario_id IS NULL AND existencia_lote_origen_id IS NULL AND existencia_lote_destino_id IS NULL)
      OR
      (lote_inventario_id IS NOT NULL AND existencia_lote_origen_id IS NOT NULL AND existencia_lote_destino_id IS NOT NULL)
    )
);

EXEC(N'ALTER TABLE dbo.inventario_almacenes ADD CONSTRAINT inventario_almacenes_codigo_key UNIQUE (codigo)');
ALTER TABLE dbo.inventario_existencias ADD CONSTRAINT inventario_existencias_inventario_producto_id_producto_id_key UNIQUE (inventario_producto_id, producto_id);
EXEC(N'ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT inventario_lotes_producto_id_codigo_lote_key UNIQUE (producto_id, codigo_lote)');
EXEC(N'ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT inventario_lotes_lote_inventario_id_producto_id_key UNIQUE (lote_inventario_id, producto_id)');

EXEC(N'CREATE UNIQUE INDEX inventario_transacciones_transaccion_revertida_id_key ON dbo.inventario_transacciones(transaccion_revertida_id) WHERE transaccion_revertida_id IS NOT NULL');

EXEC(N'CREATE INDEX inventario_lotes_producto_id_idx ON dbo.inventario_lotes(producto_id)');
CREATE INDEX inventario_existencias_lotes_lote_inventario_id_idx ON dbo.inventario_existencias_lotes(lote_inventario_id);
CREATE INDEX inventario_existencias_lotes_producto_id_idx ON dbo.inventario_existencias_lotes(producto_id);
EXEC(N'CREATE INDEX inventario_transacciones_existencia_lote_id_idx ON dbo.inventario_transacciones(existencia_lote_id)');
EXEC(N'CREATE INDEX inventario_transacciones_transferencia_id_idx ON dbo.inventario_transacciones(transferencia_id)');
EXEC(N'CREATE INDEX inventario_transacciones_subtipo_transaccion_idx ON dbo.inventario_transacciones(subtipo_transaccion)');
CREATE INDEX inventario_transferencias_producto_id_idx ON dbo.inventario_transferencias(producto_id);
CREATE INDEX inventario_transferencias_inventario_producto_origen_id_idx ON dbo.inventario_transferencias(inventario_producto_origen_id);
CREATE INDEX inventario_transferencias_inventario_producto_destino_id_idx ON dbo.inventario_transferencias(inventario_producto_destino_id);
CREATE INDEX inventario_transferencias_existencia_lote_origen_id_idx ON dbo.inventario_transferencias(existencia_lote_origen_id);
CREATE INDEX inventario_transferencias_existencia_lote_destino_id_idx ON dbo.inventario_transferencias(existencia_lote_destino_id);
CREATE INDEX inventario_transferencias_lote_inventario_id_idx ON dbo.inventario_transferencias(lote_inventario_id);
CREATE INDEX inventario_transferencias_usuario_id_idx ON dbo.inventario_transferencias(usuario_id);
CREATE INDEX inventario_transferencias_fecha_transferencia_idx ON dbo.inventario_transferencias(fecha_transferencia);

ALTER TABLE dbo.inventario_productos ADD CONSTRAINT CK_inventario_productos_codigo_canonico
CHECK (codigo = UPPER(LTRIM(RTRIM(codigo))) AND codigo NOT LIKE N'% %' AND codigo <> N'');
ALTER TABLE dbo.inventario_productos ADD CONSTRAINT CK_inventario_productos_unidad_base
CHECK (unidad_medida = LTRIM(RTRIM(unidad_medida)) AND unidad_medida <> N'');
EXEC(N'ALTER TABLE dbo.inventario_almacenes ADD CONSTRAINT CK_inventario_almacenes_codigo_canonico CHECK (codigo = UPPER(LTRIM(RTRIM(codigo))) AND codigo NOT LIKE N''% %'' AND codigo <> N'''')');
ALTER TABLE dbo.inventario_existencias ADD CONSTRAINT CK_inventario_existencias_saldos
CHECK (existencia_actual >= 0 AND existencia_minima >= 0);
ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT CK_inventario_lotes_costo
CHECK (costo_unitario IS NULL OR costo_unitario >= 0);
ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT CK_inventario_lotes_fechas
CHECK (fecha_fabricacion IS NULL OR fecha_vencimiento IS NULL OR fecha_fabricacion <= fecha_vencimiento);
ALTER TABLE dbo.proveedores_productos ADD CONSTRAINT CK_proveedores_productos_precio_referencia
CHECK (precio_referencia IS NULL OR precio_referencia >= 0);
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_cantidad CHECK (cantidad <> 0)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_costo CHECK (costo_unitario IS NULL OR costo_unitario >= 0)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_tipo_subtipo CHECK (
 (tipo_transaccion = N''INGRESO'' AND cantidad > 0 AND subtipo_transaccion IN (N''COMPRA'', N''INVENTARIO_INICIAL'', N''TRANSFERENCIA_ENTRADA''))
 OR (tipo_transaccion = N''SALIDA'' AND cantidad < 0 AND subtipo_transaccion IN (N''DEVOLUCION_PROVEEDOR'', N''MERMA'', N''DISPOSICION'', N''ALIMENTACION'', N''SANIDAD'', N''TRANSFERENCIA_SALIDA''))
 OR (tipo_transaccion = N''AJUSTE'' AND subtipo_transaccion IN (N''CONTEO_FISICO'', N''REVERSION''))
)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_transferencia CHECK (
 (subtipo_transaccion IN (N''TRANSFERENCIA_ENTRADA'', N''TRANSFERENCIA_SALIDA'') AND transferencia_id IS NOT NULL)
 OR (subtipo_transaccion NOT IN (N''TRANSFERENCIA_ENTRADA'', N''TRANSFERENCIA_SALIDA'') AND transferencia_id IS NULL)
)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_reversion CHECK (
 (subtipo_transaccion = N''REVERSION'' AND transaccion_revertida_id IS NOT NULL)
 OR (subtipo_transaccion <> N''REVERSION'' AND transaccion_revertida_id IS NULL)
)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_proveedor CHECK (
 (subtipo_transaccion IN (N''COMPRA'', N''DEVOLUCION_PROVEEDOR'') AND proveedor_id IS NOT NULL)
 OR subtipo_transaccion NOT IN (N''COMPRA'', N''DEVOLUCION_PROVEEDOR'')
)');

EXEC(N'ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT inventario_lotes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES dbo.inventario_productos(producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
ALTER TABLE dbo.inventario_existencias_lotes ADD CONSTRAINT inventario_existencias_lotes_inventario_producto_id_producto_id_fkey FOREIGN KEY (inventario_producto_id, producto_id) REFERENCES dbo.inventario_existencias(inventario_producto_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_existencias_lotes ADD CONSTRAINT inventario_existencias_lotes_lote_inventario_id_producto_id_fkey FOREIGN KEY (lote_inventario_id, producto_id) REFERENCES dbo.inventario_lotes(lote_inventario_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES dbo.inventario_productos(producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_origen_producto_fkey FOREIGN KEY (inventario_producto_origen_id, producto_id) REFERENCES dbo.inventario_existencias(inventario_producto_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_destino_producto_fkey FOREIGN KEY (inventario_producto_destino_id, producto_id) REFERENCES dbo.inventario_existencias(inventario_producto_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_lote_origen_fkey FOREIGN KEY (existencia_lote_origen_id, inventario_producto_origen_id, producto_id) REFERENCES dbo.inventario_existencias_lotes(existencia_lote_id, inventario_producto_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_lote_destino_fkey FOREIGN KEY (existencia_lote_destino_id, inventario_producto_destino_id, producto_id) REFERENCES dbo.inventario_existencias_lotes(existencia_lote_id, inventario_producto_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_lote_producto_fkey FOREIGN KEY (lote_inventario_id, producto_id) REFERENCES dbo.inventario_lotes(lote_inventario_id, producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.inventario_transferencias ADD CONSTRAINT inventario_transferencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios_cuentas(usuario_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT inventario_transacciones_existencia_lote_fkey FOREIGN KEY (existencia_lote_id, inventario_producto_id) REFERENCES dbo.inventario_existencias_lotes(existencia_lote_id, inventario_producto_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT inventario_transacciones_transferencia_id_fkey FOREIGN KEY (transferencia_id) REFERENCES dbo.inventario_transferencias(transferencia_id) ON DELETE NO ACTION ON UPDATE NO ACTION');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT inventario_transacciones_transaccion_revertida_id_fkey FOREIGN KEY (transaccion_revertida_id) REFERENCES dbo.inventario_transacciones(transaccion_inventario_id) ON DELETE NO ACTION ON UPDATE NO ACTION');

COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;
