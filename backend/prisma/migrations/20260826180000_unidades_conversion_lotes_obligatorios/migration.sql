/*
  Esta migracion solo admite una base vacia reconstruida desde cero o el estado
  legacy aprobado. No inventa lotes ni snapshots para los dos movimientos
  historicos sin lote.
*/
DECLARE @productos BIGINT=(SELECT COUNT_BIG(*) FROM dbo.inventario_productos);
DECLARE @transacciones BIGINT=(SELECT COUNT_BIG(*) FROM dbo.inventario_transacciones);
DECLARE @estadoVacio BIT=CASE WHEN @productos=0 AND @transacciones=0 THEN 1 ELSE 0 END;
DECLARE @estadoLegacy BIT=CASE WHEN
    @productos=13
    AND (SELECT COUNT_BIG(*) FROM dbo.inventario_productos WHERE maneja_lotes=0)=12
    AND (SELECT COUNT_BIG(*) FROM dbo.inventario_existencias e JOIN dbo.inventario_productos p ON p.producto_id=e.producto_id WHERE p.maneja_lotes=0 AND e.existencia_actual>0)=0
    AND (SELECT COUNT_BIG(*) FROM dbo.inventario_lotes)=0
    AND (SELECT COUNT_BIG(*) FROM dbo.inventario_transacciones WHERE existencia_lote_id IS NULL)=2
    AND EXISTS(SELECT 1 FROM dbo.inventario_transacciones WHERE transaccion_inventario_id=1 AND tipo_transaccion=N'INGRESO' AND subtipo_transaccion=N'INVENTARIO_INICIAL' AND cantidad=100 AND costo_unitario=5 AND existencia_lote_id IS NULL AND transaccion_revertida_id IS NULL)
    AND EXISTS(SELECT 1 FROM dbo.inventario_transacciones WHERE transaccion_inventario_id=2 AND tipo_transaccion=N'AJUSTE' AND subtipo_transaccion=N'REVERSION' AND cantidad=-100 AND costo_unitario=5 AND existencia_lote_id IS NULL AND transaccion_revertida_id=1)
    AND (SELECT COUNT_BIG(*) FROM dbo.alimentacion_detalles WHERE existencia_lote_id IS NULL)=0
    AND (SELECT COUNT_BIG(*) FROM dbo.sanidad_aplicaciones_fuentes WHERE existencia_lote_id IS NULL)=0
    AND (SELECT COUNT_BIG(*) FROM dbo.inventario_transferencias WHERE lote_inventario_id IS NULL OR existencia_lote_origen_id IS NULL OR existencia_lote_destino_id IS NULL)=0
THEN 1 ELSE 0 END;
IF @estadoVacio=0 AND @estadoLegacy=0
    THROW 51000, 'El preflight de lotes obligatorios no coincide con el estado aprobado.', 1;

CREATE TABLE dbo.inventario_unidades_medida (
    unidad_medida_id INT IDENTITY(1,1) NOT NULL,
    codigo NVARCHAR(20) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    dimension NVARCHAR(20) NOT NULL,
    factor_referencia DECIMAL(30,15) NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_inventario_unidades_activo DEFAULT 1,
    fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT DF_inventario_unidades_creacion DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_inventario_unidades_actualizacion DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT PK_inventario_unidades_medida PRIMARY KEY (unidad_medida_id),
    CONSTRAINT UQ_inventario_unidades_codigo UNIQUE (codigo),
    CONSTRAINT UQ_inventario_unidades_dimension_codigo UNIQUE (dimension,codigo),
    CONSTRAINT CK_inventario_unidades_dimension CHECK (dimension IN (N'PESO',N'VOLUMEN',N'UNIDADES')),
    CONSTRAINT CK_inventario_unidades_factor CHECK (factor_referencia > 0)
);

INSERT INTO dbo.inventario_unidades_medida(codigo,nombre,dimension,factor_referencia) VALUES
(N'g',N'Gramo',N'PESO',1),(N'kg',N'Kilogramo',N'PESO',1000),(N'lb',N'Libra',N'PESO',453.59237),
(N'oz',N'Onza',N'PESO',28.349523125),(N'qq',N'Quintal',N'PESO',45359.237),(N't',N'Tonelada',N'PESO',1000000),
(N'mL',N'Mililitro',N'VOLUMEN',1),(N'L',N'Litro',N'VOLUMEN',1000),(N'unidad',N'Unidad',N'UNIDADES',1);

IF EXISTS (SELECT 1 FROM dbo.inventario_productos WHERE unidad_medida NOT IN (SELECT codigo FROM dbo.inventario_unidades_medida))
    THROW 51000, 'Existen productos con unidades no normalizadas.', 1;

UPDATE dbo.inventario_productos SET maneja_lotes=1;
ALTER TABLE dbo.inventario_productos ALTER COLUMN unidad_medida NVARCHAR(20) NOT NULL;
ALTER TABLE dbo.inventario_productos ADD CONSTRAINT FK_inventario_productos_unidad FOREIGN KEY(unidad_medida) REFERENCES dbo.inventario_unidades_medida(codigo);
ALTER TABLE dbo.inventario_productos ADD CONSTRAINT CK_inventario_productos_lotes_obligatorios CHECK(maneja_lotes=1);

CREATE SEQUENCE dbo.inventario_lotes_codigo_seq AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
ALTER TABLE dbo.inventario_lotes ADD
    transaccion_origen_id INT NULL,
    unidad_base_snapshot NVARCHAR(20) NULL;
EXEC(N'UPDATE l SET unidad_base_snapshot=p.unidad_medida FROM dbo.inventario_lotes l JOIN dbo.inventario_productos p ON p.producto_id=l.producto_id');
EXEC(N'ALTER TABLE dbo.inventario_lotes ALTER COLUMN unidad_base_snapshot NVARCHAR(20) NOT NULL');
ALTER TABLE dbo.inventario_lotes ALTER COLUMN costo_unitario DECIMAL(38,18) NOT NULL;
ALTER TABLE dbo.inventario_lotes DROP CONSTRAINT IF EXISTS inventario_lotes_producto_id_codigo_lote_key;
CREATE UNIQUE INDEX UQ_inventario_lotes_codigo ON dbo.inventario_lotes(codigo_lote);
EXEC(N'ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT DF_inventario_lotes_codigo DEFAULT (N''INV''+RIGHT(N''000000''+CONVERT(NVARCHAR(20),NEXT VALUE FOR dbo.inventario_lotes_codigo_seq),6)) FOR codigo_lote');

ALTER TABLE dbo.inventario_transacciones ADD
    cantidad_comercial DECIMAL(24,6) NULL,
    unidad_comercial NVARCHAR(20) NULL,
    factor_conversion DECIMAL(30,15) NULL,
    unidad_base_snapshot NVARCHAR(20) NULL,
    precio_total_ingreso DECIMAL(20,4) NULL,
    legado_sin_lote BIT NOT NULL CONSTRAINT DF_inventario_transacciones_legado_sin_lote DEFAULT 0;
ALTER TABLE dbo.inventario_transacciones ALTER COLUMN cantidad DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.inventario_transacciones ALTER COLUMN costo_unitario DECIMAL(38,18) NULL;
ALTER TABLE dbo.inventario_existencias ALTER COLUMN existencia_actual DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.inventario_existencias ALTER COLUMN existencia_minima DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.inventario_existencias_lotes ALTER COLUMN existencia_actual DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.inventario_transferencias ALTER COLUMN cantidad DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.alimentacion_detalles ALTER COLUMN cantidad_consumida DECIMAL(24,6) NOT NULL;
ALTER TABLE dbo.sanidad_aplicaciones_fuentes ALTER COLUMN cantidad_consumida DECIMAL(24,6) NOT NULL;
EXEC(N'UPDATE dbo.inventario_transacciones SET legado_sin_lote=1 WHERE existencia_lote_id IS NULL');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT FK_inventario_transacciones_unidad_comercial FOREIGN KEY(unidad_comercial) REFERENCES dbo.inventario_unidades_medida(codigo)');
EXEC(N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT CK_inventario_transacciones_lote_obligatorio CHECK(
    (legado_sin_lote=1 AND existencia_lote_id IS NULL AND unidad_base_snapshot IS NULL AND cantidad_comercial IS NULL AND unidad_comercial IS NULL AND factor_conversion IS NULL AND precio_total_ingreso IS NULL)
    OR
    (legado_sin_lote=0 AND existencia_lote_id IS NOT NULL AND unidad_base_snapshot IS NOT NULL AND costo_unitario IS NOT NULL)
)');
EXEC(N'ALTER TABLE dbo.inventario_lotes ADD CONSTRAINT FK_inventario_lotes_transaccion_origen FOREIGN KEY(transaccion_origen_id) REFERENCES dbo.inventario_transacciones(transaccion_inventario_id)');
EXEC(N'CREATE UNIQUE INDEX UQ_inventario_lotes_transaccion_origen ON dbo.inventario_lotes(transaccion_origen_id) WHERE transaccion_origen_id IS NOT NULL');
CREATE UNIQUE INDEX UQ_inventario_transacciones_alimentacion_detalle ON dbo.inventario_transacciones(alimentacion_detalle_id) WHERE alimentacion_detalle_id IS NOT NULL;
CREATE UNIQUE INDEX UQ_inventario_transacciones_sanidad_fuente ON dbo.inventario_transacciones(sanidad_fuente_id) WHERE sanidad_fuente_id IS NOT NULL;
CREATE INDEX IX_inventario_unidades_dimension_activo ON dbo.inventario_unidades_medida(dimension,activo);

ALTER TABLE dbo.alimentacion_detalles DROP CONSTRAINT CK_alimentacion_detalles_fuente;
DROP INDEX UX_alimentacion_detalles_fuente_sin_lote ON dbo.alimentacion_detalles;
DROP INDEX UX_alimentacion_detalles_fuente_lote ON dbo.alimentacion_detalles;
DROP INDEX IX_alimentacion_detalles_existencia_lote ON dbo.alimentacion_detalles;
ALTER TABLE dbo.alimentacion_detalles ALTER COLUMN existencia_lote_id INT NOT NULL;
ALTER TABLE dbo.alimentacion_detalles ADD CONSTRAINT CK_alimentacion_detalles_fuente CHECK(inventario_id IS NULL AND existencia_lote_id IS NOT NULL);
CREATE UNIQUE INDEX UX_alimentacion_detalles_fuente_lote ON dbo.alimentacion_detalles(alimentacion_id,producto_id,existencia_lote_id);
CREATE INDEX IX_alimentacion_detalles_existencia_lote ON dbo.alimentacion_detalles(existencia_lote_id);
ALTER TABLE dbo.sanidad_aplicaciones_fuentes DROP CONSTRAINT CK_sanidad_fuentes_origen;
DROP INDEX UX_sanidad_fuente_sin_lote ON dbo.sanidad_aplicaciones_fuentes;
DROP INDEX UX_sanidad_fuente_con_lote ON dbo.sanidad_aplicaciones_fuentes;
DROP INDEX sanidad_aplicaciones_fuentes_existencia_lote_id_idx ON dbo.sanidad_aplicaciones_fuentes;
ALTER TABLE dbo.sanidad_aplicaciones_fuentes ALTER COLUMN existencia_lote_id INT NOT NULL;
ALTER TABLE dbo.sanidad_aplicaciones_fuentes ADD CONSTRAINT CK_sanidad_fuentes_origen CHECK(inventario_id IS NULL AND existencia_lote_id IS NOT NULL);
CREATE UNIQUE INDEX UX_sanidad_fuente_con_lote ON dbo.sanidad_aplicaciones_fuentes(detalle_sanidad_id,existencia_lote_id);
CREATE INDEX sanidad_aplicaciones_fuentes_existencia_lote_id_idx ON dbo.sanidad_aplicaciones_fuentes(existencia_lote_id);
DROP INDEX inventario_transferencias_existencia_lote_origen_id_idx ON dbo.inventario_transferencias;
DROP INDEX inventario_transferencias_existencia_lote_destino_id_idx ON dbo.inventario_transferencias;
DROP INDEX inventario_transferencias_lote_inventario_id_idx ON dbo.inventario_transferencias;
ALTER TABLE dbo.inventario_transferencias ALTER COLUMN existencia_lote_origen_id INT NOT NULL;
ALTER TABLE dbo.inventario_transferencias ALTER COLUMN existencia_lote_destino_id INT NOT NULL;
ALTER TABLE dbo.inventario_transferencias ALTER COLUMN lote_inventario_id INT NOT NULL;
CREATE INDEX inventario_transferencias_existencia_lote_origen_id_idx ON dbo.inventario_transferencias(existencia_lote_origen_id);
CREATE INDEX inventario_transferencias_existencia_lote_destino_id_idx ON dbo.inventario_transferencias(existencia_lote_destino_id);
CREATE INDEX inventario_transferencias_lote_inventario_id_idx ON dbo.inventario_transferencias(lote_inventario_id);
