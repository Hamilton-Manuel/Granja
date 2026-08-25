SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.sanidad_aplicaciones) OR EXISTS (SELECT 1 FROM dbo.inventario_transacciones WHERE aplicacion_sanitaria_id IS NOT NULL)
    THROW 51000, 'SANIDAD_DATOS_HISTORICOS_INCOMPATIBLES: la migracion no puede inventar detalles clinicos ni fuentes fisicas.', 1;

ALTER TABLE dbo.inventario_transacciones DROP CONSTRAINT inventario_transacciones_aplicacion_sanitaria_id_fkey;
DROP INDEX inventario_transacciones_aplicacion_sanitaria_id_idx ON dbo.inventario_transacciones;
ALTER TABLE dbo.sanidad_aplicaciones DROP CONSTRAINT sanidad_aplicaciones_producto_id_fkey;
ALTER TABLE dbo.sanidad_aplicaciones DROP CONSTRAINT CK_sanidad_aplicaciones_dosis;
ALTER TABLE dbo.sanidad_aplicaciones DROP CONSTRAINT CK_sanidad_aplicaciones_cantidad_total;
ALTER TABLE dbo.sanidad_aplicaciones DROP CONSTRAINT CK_sanidad_aplicaciones_proxima_fecha;
DROP INDEX sanidad_aplicaciones_producto_id_idx ON dbo.sanidad_aplicaciones;
DROP INDEX sanidad_aplicaciones_tipo_aplicacion_idx ON dbo.sanidad_aplicaciones;
DROP INDEX sanidad_aplicaciones_fecha_aplicacion_idx ON dbo.sanidad_aplicaciones;

CREATE TABLE dbo.sanidad_tipos_aplicaciones (
 tipo_aplicacion_id INT IDENTITY(1,1) NOT NULL CONSTRAINT sanidad_tipos_aplicaciones_pkey PRIMARY KEY,
 codigo NVARCHAR(50) NOT NULL CONSTRAINT sanidad_tipos_aplicaciones_codigo_key UNIQUE,
 nombre NVARCHAR(100) NOT NULL, descripcion NVARCHAR(500) NULL, activo BIT NOT NULL CONSTRAINT DF_sanidad_tipos_activo DEFAULT 1,
 fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_tipos_fc DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_tipos_fa DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT CK_sanidad_tipos_codigo CHECK (codigo=UPPER(LTRIM(RTRIM(codigo))) AND codigo NOT LIKE N'%[^A-Z0-9_]%' AND LEN(codigo)>0)
);
CREATE INDEX sanidad_tipos_aplicaciones_activo_idx ON dbo.sanidad_tipos_aplicaciones(activo);

CREATE TABLE dbo.sanidad_vias_administracion (
 via_administracion_id INT IDENTITY(1,1) NOT NULL CONSTRAINT sanidad_vias_administracion_pkey PRIMARY KEY,
 codigo NVARCHAR(50) NOT NULL CONSTRAINT sanidad_vias_administracion_codigo_key UNIQUE,
 nombre NVARCHAR(100) NOT NULL, descripcion NVARCHAR(500) NULL, activo BIT NOT NULL CONSTRAINT DF_sanidad_vias_activo DEFAULT 1,
 fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_vias_fc DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_vias_fa DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT CK_sanidad_vias_codigo CHECK (codigo=UPPER(LTRIM(RTRIM(codigo))) AND codigo NOT LIKE N'%[^A-Z0-9_]%' AND LEN(codigo)>0)
);
CREATE INDEX sanidad_vias_administracion_activo_idx ON dbo.sanidad_vias_administracion(activo);

CREATE TABLE dbo.sanidad_unidades_dosis (
 unidad_dosis_id INT IDENTITY(1,1) NOT NULL CONSTRAINT sanidad_unidades_dosis_pkey PRIMARY KEY,
 codigo NVARCHAR(50) NOT NULL CONSTRAINT sanidad_unidades_dosis_codigo_key UNIQUE,
 nombre NVARCHAR(100) NOT NULL, descripcion NVARCHAR(500) NULL, activo BIT NOT NULL CONSTRAINT DF_sanidad_unidades_activo DEFAULT 1,
 fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_unidades_fc DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_unidades_fa DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT CK_sanidad_unidades_codigo CHECK (codigo=UPPER(LTRIM(RTRIM(codigo))) AND codigo NOT LIKE N'%[^A-Z0-9_]%' AND LEN(codigo)>0)
);
CREATE INDEX sanidad_unidades_dosis_activo_idx ON dbo.sanidad_unidades_dosis(activo);

INSERT dbo.sanidad_tipos_aplicaciones(codigo,nombre) VALUES
(N'VACUNA',N'Vacuna'),(N'MEDICAMENTO',N'Medicamento'),(N'VITAMINA',N'Vitamina'),(N'DESPARASITACION',N'Desparasitación'),(N'PROCEDIMIENTO',N'Procedimiento'),(N'OTRO',N'Otro');
INSERT dbo.sanidad_vias_administracion(codigo,nombre) VALUES
(N'ORAL',N'Oral'),(N'INYECTABLE',N'Inyectable'),(N'TOPICA',N'Tópica'),(N'OCULAR',N'Ocular'),(N'NASAL',N'Nasal'),(N'OTRA',N'Otra');
INSERT dbo.sanidad_unidades_dosis(codigo,nombre) VALUES
(N'MG',N'mg'),(N'G',N'g'),(N'ML',N'ml'),(N'L',N'l'),(N'DOSIS',N'Dosis'),(N'UNIDAD',N'Unidad');

ALTER TABLE dbo.sanidad_aplicaciones DROP COLUMN producto_id,tipo_aplicacion,dosis,unidad_medida,cantidad_total_utilizada;
ALTER TABLE dbo.sanidad_aplicaciones ALTER COLUMN fecha_aplicacion DATETIME2(7) NOT NULL;
ALTER TABLE dbo.sanidad_aplicaciones ADD tipo_aplicacion_id INT NULL, motivo NVARCHAR(500) NULL, diagnostico NVARCHAR(1000) NULL,
 estado NVARCHAR(20) NOT NULL CONSTRAINT DF_sanidad_aplicaciones_estado DEFAULT N'CONFIRMADA', usuario_reversion_id INT NULL,
 fecha_reversion DATETIME2(7) NULL, motivo_reversion NVARCHAR(500) NULL;
ALTER TABLE dbo.sanidad_aplicaciones ALTER COLUMN tipo_aplicacion_id INT NOT NULL;
ALTER TABLE dbo.sanidad_aplicaciones ALTER COLUMN motivo NVARCHAR(500) NOT NULL;
ALTER TABLE dbo.sanidad_aplicaciones ADD CONSTRAINT sanidad_aplicaciones_tipo_aplicacion_id_fkey FOREIGN KEY(tipo_aplicacion_id) REFERENCES dbo.sanidad_tipos_aplicaciones(tipo_aplicacion_id),
 CONSTRAINT sanidad_aplicaciones_usuario_reversion_id_fkey FOREIGN KEY(usuario_reversion_id) REFERENCES dbo.usuarios_cuentas(usuario_id),
 CONSTRAINT CK_sanidad_aplicaciones_estado CHECK (estado IN (N'CONFIRMADA',N'REVERTIDA')),
 CONSTRAINT CK_sanidad_aplicaciones_reversion CHECK ((estado=N'CONFIRMADA' AND usuario_reversion_id IS NULL AND fecha_reversion IS NULL AND motivo_reversion IS NULL) OR (estado=N'REVERTIDA' AND usuario_reversion_id IS NOT NULL AND fecha_reversion IS NOT NULL AND LEN(LTRIM(RTRIM(motivo_reversion)))>0)),
 CONSTRAINT CK_sanidad_aplicaciones_motivo CHECK (LEN(LTRIM(RTRIM(motivo)))>0),
 CONSTRAINT CK_sanidad_aplicaciones_proxima_fecha CHECK (proxima_aplicacion IS NULL OR proxima_aplicacion>=CONVERT(date,fecha_aplicacion));
CREATE INDEX sanidad_aplicaciones_tipo_aplicacion_id_idx ON dbo.sanidad_aplicaciones(tipo_aplicacion_id);
CREATE INDEX sanidad_aplicaciones_fecha_aplicacion_idx ON dbo.sanidad_aplicaciones(fecha_aplicacion);
CREATE INDEX sanidad_aplicaciones_estado_idx ON dbo.sanidad_aplicaciones(estado);

CREATE TABLE dbo.sanidad_productos_habilitados (
 producto_id INT NOT NULL CONSTRAINT sanidad_productos_habilitados_pkey PRIMARY KEY,
 activo BIT NOT NULL CONSTRAINT DF_sanidad_productos_activo DEFAULT 1,
 fecha_creacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_productos_fc DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 fecha_actualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_productos_fa DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT sanidad_productos_habilitados_producto_id_fkey FOREIGN KEY(producto_id) REFERENCES dbo.inventario_productos(producto_id)
);
CREATE INDEX sanidad_productos_habilitados_activo_idx ON dbo.sanidad_productos_habilitados(activo);

CREATE TABLE dbo.sanidad_aplicaciones_detalles (
 detalle_sanidad_id INT IDENTITY(1,1) NOT NULL CONSTRAINT sanidad_aplicaciones_detalles_pkey PRIMARY KEY,
 aplicacion_sanitaria_id INT NOT NULL, producto_id INT NOT NULL, unidad_dosis_id INT NOT NULL, via_administracion_id INT NOT NULL,
 dosis_clinica DECIMAL(18,4) NOT NULL, alcance_dosis NVARCHAR(20) NOT NULL, unidad_inventario NVARCHAR(50) NOT NULL,
 fecha_registro DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_detalles_fr DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT sanidad_aplicaciones_detalles_aplicacion_producto_key UNIQUE(aplicacion_sanitaria_id,producto_id),
 CONSTRAINT sanidad_aplicaciones_detalles_aplicacion_fkey FOREIGN KEY(aplicacion_sanitaria_id) REFERENCES dbo.sanidad_aplicaciones(aplicacion_sanitaria_id),
 CONSTRAINT sanidad_aplicaciones_detalles_producto_fkey FOREIGN KEY(producto_id) REFERENCES dbo.inventario_productos(producto_id),
 CONSTRAINT sanidad_aplicaciones_detalles_unidad_fkey FOREIGN KEY(unidad_dosis_id) REFERENCES dbo.sanidad_unidades_dosis(unidad_dosis_id),
 CONSTRAINT sanidad_aplicaciones_detalles_via_fkey FOREIGN KEY(via_administracion_id) REFERENCES dbo.sanidad_vias_administracion(via_administracion_id),
 CONSTRAINT CK_sanidad_detalles_dosis CHECK(dosis_clinica>0),
 CONSTRAINT CK_sanidad_detalles_alcance CHECK(alcance_dosis IN(N'INDIVIDUAL',N'POR_ANIMAL',N'TOTAL_LOTE')),
 CONSTRAINT CK_sanidad_detalles_unidad CHECK(LEN(LTRIM(RTRIM(unidad_inventario)))>0)
);
CREATE INDEX sanidad_aplicaciones_detalles_producto_id_idx ON dbo.sanidad_aplicaciones_detalles(producto_id);
CREATE INDEX sanidad_aplicaciones_detalles_unidad_dosis_id_idx ON dbo.sanidad_aplicaciones_detalles(unidad_dosis_id);
CREATE INDEX sanidad_aplicaciones_detalles_via_administracion_id_idx ON dbo.sanidad_aplicaciones_detalles(via_administracion_id);

CREATE TABLE dbo.sanidad_aplicaciones_fuentes (
 fuente_sanidad_id INT IDENTITY(1,1) NOT NULL CONSTRAINT sanidad_aplicaciones_fuentes_pkey PRIMARY KEY,
 detalle_sanidad_id INT NOT NULL, producto_id INT NOT NULL, inventario_id INT NULL, existencia_lote_id INT NULL,
 cantidad_consumida DECIMAL(18,4) NOT NULL,
 fecha_registro DATETIME2(7) NOT NULL CONSTRAINT DF_sanidad_fuentes_fr DEFAULT CONVERT(datetime2(7),(SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
 CONSTRAINT sanidad_aplicaciones_fuentes_detalle_fkey FOREIGN KEY(detalle_sanidad_id) REFERENCES dbo.sanidad_aplicaciones_detalles(detalle_sanidad_id),
 CONSTRAINT sanidad_aplicaciones_fuentes_existencia_fkey FOREIGN KEY(inventario_id,producto_id) REFERENCES dbo.inventario_existencias(inventario_id,producto_id),
 CONSTRAINT sanidad_aplicaciones_fuentes_lote_fkey FOREIGN KEY(existencia_lote_id,producto_id) REFERENCES dbo.inventario_existencias_lotes(existencia_lote_id,producto_id),
 CONSTRAINT CK_sanidad_fuentes_origen CHECK((inventario_id IS NOT NULL AND existencia_lote_id IS NULL) OR (inventario_id IS NULL AND existencia_lote_id IS NOT NULL)),
 CONSTRAINT CK_sanidad_fuentes_cantidad CHECK(cantidad_consumida>0)
);
CREATE INDEX sanidad_aplicaciones_fuentes_detalle_sanidad_id_idx ON dbo.sanidad_aplicaciones_fuentes(detalle_sanidad_id);
CREATE INDEX sanidad_aplicaciones_fuentes_producto_id_idx ON dbo.sanidad_aplicaciones_fuentes(producto_id);
CREATE INDEX sanidad_aplicaciones_fuentes_inventario_id_idx ON dbo.sanidad_aplicaciones_fuentes(inventario_id);
CREATE INDEX sanidad_aplicaciones_fuentes_existencia_lote_id_idx ON dbo.sanidad_aplicaciones_fuentes(existencia_lote_id);
CREATE UNIQUE INDEX UX_sanidad_fuente_sin_lote ON dbo.sanidad_aplicaciones_fuentes(detalle_sanidad_id,inventario_id) WHERE inventario_id IS NOT NULL;
CREATE UNIQUE INDEX UX_sanidad_fuente_con_lote ON dbo.sanidad_aplicaciones_fuentes(detalle_sanidad_id,existencia_lote_id) WHERE existencia_lote_id IS NOT NULL;

ALTER TABLE dbo.inventario_transacciones DROP COLUMN aplicacion_sanitaria_id;
ALTER TABLE dbo.inventario_transacciones ADD sanidad_fuente_id INT NULL;
EXEC sys.sp_executesql N'ALTER TABLE dbo.inventario_transacciones ADD CONSTRAINT inventario_transacciones_sanidad_fuente_id_fkey FOREIGN KEY(sanidad_fuente_id) REFERENCES dbo.sanidad_aplicaciones_fuentes(fuente_sanidad_id)';
EXEC sys.sp_executesql N'CREATE INDEX inventario_transacciones_sanidad_fuente_id_idx ON dbo.inventario_transacciones(sanidad_fuente_id)';
EXEC sys.sp_executesql N'CREATE UNIQUE INDEX UX_inventario_transacciones_sanidad_fuente ON dbo.inventario_transacciones(sanidad_fuente_id) WHERE sanidad_fuente_id IS NOT NULL';

ALTER TABLE dbo.produccion_eventos ADD aplicacion_sanitaria_id INT NULL;
EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT produccion_eventos_aplicacion_sanitaria_id_fkey FOREIGN KEY(aplicacion_sanitaria_id) REFERENCES dbo.sanidad_aplicaciones(aplicacion_sanitaria_id)';
EXEC sys.sp_executesql N'CREATE INDEX produccion_eventos_aplicacion_sanitaria_id_idx ON dbo.produccion_eventos(aplicacion_sanitaria_id)';
EXEC sys.sp_executesql N'CREATE UNIQUE INDEX UX_produccion_eventos_sanidad ON dbo.produccion_eventos(aplicacion_sanitaria_id) WHERE aplicacion_sanitaria_id IS NOT NULL';
ALTER TABLE dbo.produccion_eventos DROP CONSTRAINT CK_produccion_eventos_referencia;
EXEC sys.sp_executesql N'ALTER TABLE dbo.produccion_eventos ADD CONSTRAINT CK_produccion_eventos_referencia CHECK (
 (tipo_evento=N''MEDICION'' AND medicion_id IS NOT NULL AND operacion_produccion_id IS NULL AND historial_estado_id IS NULL AND alimentacion_id IS NULL AND aplicacion_sanitaria_id IS NULL) OR
 (tipo_evento=N''ALIMENTACION'' AND alimentacion_id IS NOT NULL AND operacion_produccion_id IS NULL AND medicion_id IS NULL AND historial_estado_id IS NULL AND aplicacion_sanitaria_id IS NULL) OR
 (tipo_evento=N''APLICACION_SANITARIA'' AND aplicacion_sanitaria_id IS NOT NULL AND operacion_produccion_id IS NULL AND medicion_id IS NULL AND historial_estado_id IS NULL AND alimentacion_id IS NULL) OR
 (tipo_evento=N''CAMBIO_LOTE'' AND operacion_produccion_id IS NOT NULL AND medicion_id IS NULL AND historial_estado_id IS NULL AND alimentacion_id IS NULL AND aplicacion_sanitaria_id IS NULL) OR
 (tipo_evento=N''CAMBIO_ESTADO'' AND operacion_produccion_id IS NOT NULL AND historial_estado_id IS NOT NULL AND medicion_id IS NULL AND alimentacion_id IS NULL AND aplicacion_sanitaria_id IS NULL))';

COMMIT TRANSACTION;
