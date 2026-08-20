BEGIN TRY

BEGIN TRAN;


-- INICIO: SQL GENERADO POR PRISMA

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[usuarios_roles] (
    [rol_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [usuarios_roles_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_roles_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_roles_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [usuarios_roles_pkey] PRIMARY KEY CLUSTERED ([rol_id]),
    CONSTRAINT [usuarios_roles_nombre_key] UNIQUE NONCLUSTERED ([nombre])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_permisos] (
    [permiso_id] INT NOT NULL IDENTITY(1,1),
    [codigo] NVARCHAR(100) NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [modulo] NVARCHAR(100) NOT NULL,
    [accion] NVARCHAR(100) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [usuarios_permisos_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_permisos_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [usuarios_permisos_pkey] PRIMARY KEY CLUSTERED ([permiso_id]),
    CONSTRAINT [usuarios_permisos_codigo_key] UNIQUE NONCLUSTERED ([codigo])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_cuentas] (
    [usuario_id] INT NOT NULL IDENTITY(1,1),
    [rol_id] INT NOT NULL,
    [nombre_completo] NVARCHAR(200) NOT NULL,
    [nombre_usuario] NVARCHAR(100) NOT NULL,
    [correo] NVARCHAR(200) NOT NULL,
    [contrasena_hash] NVARCHAR(255) NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [usuarios_cuentas_estado_df] DEFAULT 'ACTIVO',
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_cuentas_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_cuentas_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [usuarios_cuentas_pkey] PRIMARY KEY CLUSTERED ([usuario_id]),
    CONSTRAINT [usuarios_cuentas_nombre_usuario_key] UNIQUE NONCLUSTERED ([nombre_usuario]),
    CONSTRAINT [usuarios_cuentas_correo_key] UNIQUE NONCLUSTERED ([correo])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_roles_permisos] (
    [rol_permiso_id] INT NOT NULL IDENTITY(1,1),
    [rol_id] INT NOT NULL,
    [permiso_id] INT NOT NULL,
    [usuario_asignador_id] INT NOT NULL,
    [fecha_asignacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_roles_permisos_fecha_asignacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [usuarios_roles_permisos_pkey] PRIMARY KEY CLUSTERED ([rol_permiso_id]),
    CONSTRAINT [usuarios_roles_permisos_rol_id_permiso_id_key] UNIQUE NONCLUSTERED ([rol_id],[permiso_id])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_sesiones] (
    [sesion_id] INT NOT NULL IDENTITY(1,1),
    [usuario_id] INT NOT NULL,
    [token] NVARCHAR(500) NOT NULL,
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [usuarios_sesiones_fecha_inicio_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_expiracion] DATETIME2 NOT NULL,
    [fecha_cierre] DATETIME2,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [usuarios_sesiones_estado_df] DEFAULT 'ACTIVA',
    [direccion_ip] NVARCHAR(45),
    CONSTRAINT [usuarios_sesiones_pkey] PRIMARY KEY CLUSTERED ([sesion_id]),
    CONSTRAINT [usuarios_sesiones_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_bitacora] (
    [bitacora_id] INT NOT NULL IDENTITY(1,1),
    [usuario_id] INT,
    [modulo] NVARCHAR(100) NOT NULL,
    [accion] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(1000) NOT NULL,
    [resultado] NVARCHAR(50) NOT NULL,
    [fecha] DATETIME2 NOT NULL CONSTRAINT [usuarios_bitacora_fecha_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [direccion_ip] NVARCHAR(45),
    CONSTRAINT [usuarios_bitacora_pkey] PRIMARY KEY CLUSTERED ([bitacora_id])
);

-- CreateTable
CREATE TABLE [dbo].[clientes_registros] (
    [cliente_id] INT NOT NULL IDENTITY(1,1),
    [nombre_completo] NVARCHAR(200) NOT NULL,
    [numero_documento] NVARCHAR(50),
    [nit] NVARCHAR(20),
    [telefono] NVARCHAR(30),
    [correo] NVARCHAR(200),
    [direccion] NVARCHAR(500),
    [tipo_cliente] NVARCHAR(50),
    [observaciones] NVARCHAR(1000),
    [activo] BIT NOT NULL CONSTRAINT [clientes_registros_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [clientes_registros_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [clientes_registros_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [clientes_registros_pkey] PRIMARY KEY CLUSTERED ([cliente_id])
);

-- CreateTable
CREATE TABLE [dbo].[proveedores_registros] (
    [proveedor_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(200) NOT NULL,
    [nombre_comercial] NVARCHAR(200),
    [numero_documento] NVARCHAR(50),
    [nit] NVARCHAR(20),
    [telefono] NVARCHAR(30),
    [correo] NVARCHAR(200),
    [direccion] NVARCHAR(500),
    [tipo_proveedor] NVARCHAR(50),
    [observaciones] NVARCHAR(1000),
    [activo] BIT NOT NULL CONSTRAINT [proveedores_registros_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_registros_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_registros_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [proveedores_registros_pkey] PRIMARY KEY CLUSTERED ([proveedor_id])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_categorias] (
    [categoria_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [inventario_categorias_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_categorias_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [inventario_categorias_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_categorias_pkey] PRIMARY KEY CLUSTERED ([categoria_id]),
    CONSTRAINT [inventario_categorias_nombre_key] UNIQUE NONCLUSTERED ([nombre])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_productos] (
    [producto_id] INT NOT NULL IDENTITY(1,1),
    [categoria_id] INT NOT NULL,
    [codigo] NVARCHAR(50) NOT NULL,
    [nombre] NVARCHAR(200) NOT NULL,
    [descripcion] NVARCHAR(500),
    [unidad_medida] NVARCHAR(50) NOT NULL,
    [maneja_lotes] BIT NOT NULL CONSTRAINT [inventario_productos_maneja_lotes_df] DEFAULT 0,
    [activo] BIT NOT NULL CONSTRAINT [inventario_productos_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_productos_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [inventario_productos_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_productos_pkey] PRIMARY KEY CLUSTERED ([producto_id]),
    CONSTRAINT [inventario_productos_codigo_key] UNIQUE NONCLUSTERED ([codigo])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_almacenes] (
    [inventario_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [ubicacion] NVARCHAR(300),
    [activo] BIT NOT NULL CONSTRAINT [inventario_almacenes_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_almacenes_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [inventario_almacenes_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_almacenes_pkey] PRIMARY KEY CLUSTERED ([inventario_id])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_existencias] (
    [inventario_producto_id] INT NOT NULL IDENTITY(1,1),
    [inventario_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [existencia_actual] DECIMAL(18,4) NOT NULL CONSTRAINT [inventario_existencias_existencia_actual_df] DEFAULT 0,
    [existencia_minima] DECIMAL(18,4) NOT NULL CONSTRAINT [inventario_existencias_existencia_minima_df] DEFAULT 0,
    [activo] BIT NOT NULL CONSTRAINT [inventario_existencias_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_existencias_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [inventario_existencias_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_existencias_pkey] PRIMARY KEY CLUSTERED ([inventario_producto_id]),
    CONSTRAINT [inventario_existencias_inventario_id_producto_id_key] UNIQUE NONCLUSTERED ([inventario_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_lotes] (
    [lote_inventario_id] INT NOT NULL IDENTITY(1,1),
    [inventario_producto_id] INT NOT NULL,
    [proveedor_id] INT,
    [codigo_lote] NVARCHAR(100) NOT NULL,
    [fecha_ingreso] DATETIME2 NOT NULL CONSTRAINT [inventario_lotes_fecha_ingreso_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_fabricacion] DATE,
    [fecha_vencimiento] DATE,
    [costo_unitario] DECIMAL(18,4),
    [existencia_actual] DECIMAL(18,4) NOT NULL CONSTRAINT [inventario_lotes_existencia_actual_df] DEFAULT 0,
    [activo] BIT NOT NULL CONSTRAINT [inventario_lotes_activo_df] DEFAULT 1,
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_lotes_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [inventario_lotes_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_lotes_pkey] PRIMARY KEY CLUSTERED ([lote_inventario_id])
);

-- CreateTable
CREATE TABLE [dbo].[proveedores_productos] (
    [proveedor_producto_id] INT NOT NULL IDENTITY(1,1),
    [proveedor_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [precio_referencia] DECIMAL(18,4),
    [activo] BIT NOT NULL CONSTRAINT [proveedores_productos_activo_df] DEFAULT 1,
    [fecha_relacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_productos_fecha_relacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_productos_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [proveedores_productos_pkey] PRIMARY KEY CLUSTERED ([proveedor_producto_id]),
    CONSTRAINT [proveedores_productos_proveedor_id_producto_id_key] UNIQUE NONCLUSTERED ([proveedor_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_tipos_animales] (
    [tipo_animal_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [produccion_tipos_animales_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_tipos_animales_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [produccion_tipos_animales_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_razas_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [produccion_razas_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [produccion_razas_pkey] PRIMARY KEY CLUSTERED ([raza_id]),
    CONSTRAINT [produccion_razas_tipo_animal_id_nombre_key] UNIQUE NONCLUSTERED ([tipo_animal_id],[nombre])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_lotes] (
    [lote_produccion_id] INT NOT NULL IDENTITY(1,1),
    [codigo] NVARCHAR(50) NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [produccion_lotes_fecha_inicio_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_cierre] DATETIME2,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [produccion_lotes_estado_df] DEFAULT 'ACTIVO',
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_lotes_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [produccion_lotes_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_ingreso] DATETIME2 NOT NULL CONSTRAINT [produccion_animales_fecha_ingreso_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [estado_actual] NVARCHAR(20) NOT NULL CONSTRAINT [produccion_animales_estado_actual_df] DEFAULT 'ACTIVO',
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [produccion_animales_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [produccion_animales_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [produccion_animales_pkey] PRIMARY KEY CLUSTERED ([animal_id]),
    CONSTRAINT [produccion_animales_identificacion_key] UNIQUE NONCLUSTERED ([identificacion])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_asignaciones_lotes] (
    [asignacion_lote_id] INT NOT NULL IDENTITY(1,1),
    [animal_id] INT NOT NULL,
    [lote_produccion_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [produccion_asignaciones_lotes_fecha_inicio_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_cambio] DATETIME2 NOT NULL CONSTRAINT [produccion_historial_estados_fecha_cambio_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_medicion] DATETIME2 NOT NULL CONSTRAINT [produccion_mediciones_fecha_medicion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [observaciones] NVARCHAR(1000),
    CONSTRAINT [produccion_mediciones_pkey] PRIMARY KEY CLUSTERED ([medicion_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_formulas] (
    [formula_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [cantidad_base] DECIMAL(18,4) NOT NULL,
    [unidad_base] NVARCHAR(30) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [alimentacion_formulas_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_detalles_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [alimentacion_formulas_detalles_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [alimentacion_registros_fecha_registro_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [alimentacion_registros_pkey] PRIMARY KEY CLUSTERED ([alimentacion_id])
);

-- CreateTable
CREATE TABLE [dbo].[alimentacion_detalles] (
    [detalle_alimentacion_id] INT NOT NULL IDENTITY(1,1),
    [alimentacion_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [cantidad_consumida] DECIMAL(18,4) NOT NULL,
    [unidad_medida] NVARCHAR(30) NOT NULL,
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [alimentacion_detalles_fecha_registro_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
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
    [fecha_registro] DATETIME2 NOT NULL CONSTRAINT [sanidad_aplicaciones_fecha_registro_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [sanidad_aplicaciones_pkey] PRIMARY KEY CLUSTERED ([aplicacion_sanitaria_id])
);

-- CreateTable
CREATE TABLE [dbo].[ventas_registros] (
    [venta_id] INT NOT NULL IDENTITY(1,1),
    [cliente_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [fecha_venta] DATETIME2 NOT NULL CONSTRAINT [ventas_registros_fecha_venta_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [subtotal] DECIMAL(18,2) NOT NULL,
    [descuento] DECIMAL(18,2) NOT NULL CONSTRAINT [ventas_registros_descuento_df] DEFAULT 0,
    [total] DECIMAL(18,2) NOT NULL,
    [forma_pago] NVARCHAR(50) NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [ventas_registros_estado_df] DEFAULT 'PENDIENTE',
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_registros_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [fecha_actualizacion] DATETIME2 NOT NULL CONSTRAINT [ventas_registros_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [ventas_registros_pkey] PRIMARY KEY CLUSTERED ([venta_id])
);

-- CreateTable
CREATE TABLE [dbo].[ventas_detalles] (
    [detalle_venta_id] INT NOT NULL IDENTITY(1,1),
    [venta_id] INT NOT NULL,
    [lote_produccion_id] INT NOT NULL,
    [cantidad_animales] INT NOT NULL,
    [precio_unitario] DECIMAL(18,2) NOT NULL,
    [subtotal] DECIMAL(18,2) NOT NULL,
    [descripcion] NVARCHAR(500),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_detalles_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [ventas_detalles_pkey] PRIMARY KEY CLUSTERED ([detalle_venta_id]),
    CONSTRAINT [ventas_detalles_venta_id_lote_produccion_id_key] UNIQUE NONCLUSTERED ([venta_id],[lote_produccion_id])
);

-- CreateTable
CREATE TABLE [dbo].[ventas_recibos] (
    [recibo_id] INT NOT NULL IDENTITY(1,1),
    [venta_id] INT NOT NULL,
    [numero_recibo] NVARCHAR(50) NOT NULL,
    [fecha_emision] DATETIME2 NOT NULL CONSTRAINT [ventas_recibos_fecha_emision_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [monto] DECIMAL(18,2) NOT NULL,
    [concepto] NVARCHAR(1000) NOT NULL,
    [estado] NVARCHAR(20) NOT NULL CONSTRAINT [ventas_recibos_estado_df] DEFAULT 'EMITIDO',
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [ventas_recibos_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [ventas_recibos_pkey] PRIMARY KEY CLUSTERED ([recibo_id]),
    CONSTRAINT [ventas_recibos_venta_id_key] UNIQUE NONCLUSTERED ([venta_id]),
    CONSTRAINT [ventas_recibos_numero_recibo_key] UNIQUE NONCLUSTERED ([numero_recibo])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_transacciones] (
    [transaccion_inventario_id] INT NOT NULL IDENTITY(1,1),
    [inventario_producto_id] INT NOT NULL,
    [lote_inventario_id] INT,
    [usuario_id] INT NOT NULL,
    [proveedor_id] INT,
    [lote_produccion_id] INT,
    [animal_id] INT,
    [alimentacion_detalle_id] INT,
    [aplicacion_sanitaria_id] INT,
    [tipo_transaccion] NVARCHAR(30) NOT NULL,
    [cantidad] DECIMAL(18,4) NOT NULL,
    [costo_unitario] DECIMAL(18,4),
    [documento_referencia] NVARCHAR(150),
    [motivo] NVARCHAR(500),
    [observaciones] NVARCHAR(1000),
    [fecha_transaccion] DATETIME2 NOT NULL CONSTRAINT [inventario_transacciones_fecha_transaccion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [inventario_transacciones_pkey] PRIMARY KEY CLUSTERED ([transaccion_inventario_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_transacciones] (
    [transaccion_produccion_id] INT NOT NULL IDENTITY(1,1),
    [lote_produccion_id] INT NOT NULL,
    [usuario_id] INT NOT NULL,
    [venta_detalle_id] INT,
    [tipo_transaccion] NVARCHAR(30) NOT NULL,
    [cantidad] INT NOT NULL,
    [documento_referencia] NVARCHAR(150),
    [motivo] NVARCHAR(500),
    [observaciones] NVARCHAR(1000),
    [fecha_transaccion] DATETIME2 NOT NULL CONSTRAINT [produccion_transacciones_fecha_transaccion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    CONSTRAINT [produccion_transacciones_pkey] PRIMARY KEY CLUSTERED ([transaccion_produccion_id])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_eventos] (
    [evento_produccion_id] INT NOT NULL IDENTITY(1,1),
    [lote_produccion_id] INT,
    [animal_id] INT,
    [usuario_id] INT NOT NULL,
    [tipo_evento] NVARCHAR(50) NOT NULL,
    [referencia_tipo] NVARCHAR(100),
    [referencia_id] INT,
    [fecha_evento] DATETIME2 NOT NULL CONSTRAINT [produccion_eventos_fecha_evento_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
    [descripcion] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [produccion_eventos_pkey] PRIMARY KEY CLUSTERED ([evento_produccion_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_cuentas_rol_id_idx] ON [dbo].[usuarios_cuentas]([rol_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_roles_permisos_rol_id_idx] ON [dbo].[usuarios_roles_permisos]([rol_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_roles_permisos_permiso_id_idx] ON [dbo].[usuarios_roles_permisos]([permiso_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_roles_permisos_usuario_asignador_id_idx] ON [dbo].[usuarios_roles_permisos]([usuario_asignador_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_sesiones_usuario_id_idx] ON [dbo].[usuarios_sesiones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_sesiones_estado_idx] ON [dbo].[usuarios_sesiones]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_bitacora_usuario_id_idx] ON [dbo].[usuarios_bitacora]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_bitacora_modulo_idx] ON [dbo].[usuarios_bitacora]([modulo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [usuarios_bitacora_fecha_idx] ON [dbo].[usuarios_bitacora]([fecha]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [clientes_registros_nombre_completo_idx] ON [dbo].[clientes_registros]([nombre_completo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [clientes_registros_nit_idx] ON [dbo].[clientes_registros]([nit]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [clientes_registros_activo_idx] ON [dbo].[clientes_registros]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_registros_nombre_idx] ON [dbo].[proveedores_registros]([nombre]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_registros_nit_idx] ON [dbo].[proveedores_registros]([nit]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_registros_activo_idx] ON [dbo].[proveedores_registros]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_categorias_activo_idx] ON [dbo].[inventario_categorias]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_productos_categoria_id_idx] ON [dbo].[inventario_productos]([categoria_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_productos_nombre_idx] ON [dbo].[inventario_productos]([nombre]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_productos_activo_idx] ON [dbo].[inventario_productos]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_almacenes_activo_idx] ON [dbo].[inventario_almacenes]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_existencias_inventario_id_idx] ON [dbo].[inventario_existencias]([inventario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_existencias_producto_id_idx] ON [dbo].[inventario_existencias]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_existencias_activo_idx] ON [dbo].[inventario_existencias]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_lotes_inventario_producto_id_idx] ON [dbo].[inventario_lotes]([inventario_producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_lotes_proveedor_id_idx] ON [dbo].[inventario_lotes]([proveedor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_lotes_codigo_lote_idx] ON [dbo].[inventario_lotes]([codigo_lote]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_lotes_fecha_vencimiento_idx] ON [dbo].[inventario_lotes]([fecha_vencimiento]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_lotes_activo_idx] ON [dbo].[inventario_lotes]([activo]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_productos_proveedor_id_idx] ON [dbo].[proveedores_productos]([proveedor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_productos_producto_id_idx] ON [dbo].[proveedores_productos]([producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [proveedores_productos_activo_idx] ON [dbo].[proveedores_productos]([activo]);

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

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_cliente_id_idx] ON [dbo].[ventas_registros]([cliente_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_usuario_id_idx] ON [dbo].[ventas_registros]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_fecha_venta_idx] ON [dbo].[ventas_registros]([fecha_venta]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_registros_estado_idx] ON [dbo].[ventas_registros]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_detalles_venta_id_idx] ON [dbo].[ventas_detalles]([venta_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_detalles_lote_produccion_id_idx] ON [dbo].[ventas_detalles]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_recibos_fecha_emision_idx] ON [dbo].[ventas_recibos]([fecha_emision]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ventas_recibos_estado_idx] ON [dbo].[ventas_recibos]([estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_inventario_producto_id_idx] ON [dbo].[inventario_transacciones]([inventario_producto_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_lote_inventario_id_idx] ON [dbo].[inventario_transacciones]([lote_inventario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_usuario_id_idx] ON [dbo].[inventario_transacciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_proveedor_id_idx] ON [dbo].[inventario_transacciones]([proveedor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_lote_produccion_id_idx] ON [dbo].[inventario_transacciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_animal_id_idx] ON [dbo].[inventario_transacciones]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_alimentacion_detalle_id_idx] ON [dbo].[inventario_transacciones]([alimentacion_detalle_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_aplicacion_sanitaria_id_idx] ON [dbo].[inventario_transacciones]([aplicacion_sanitaria_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_tipo_transaccion_idx] ON [dbo].[inventario_transacciones]([tipo_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventario_transacciones_fecha_transaccion_idx] ON [dbo].[inventario_transacciones]([fecha_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_lote_produccion_id_idx] ON [dbo].[produccion_transacciones]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_usuario_id_idx] ON [dbo].[produccion_transacciones]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_venta_detalle_id_idx] ON [dbo].[produccion_transacciones]([venta_detalle_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_tipo_transaccion_idx] ON [dbo].[produccion_transacciones]([tipo_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_transacciones_fecha_transaccion_idx] ON [dbo].[produccion_transacciones]([fecha_transaccion]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_lote_produccion_id_idx] ON [dbo].[produccion_eventos]([lote_produccion_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_animal_id_idx] ON [dbo].[produccion_eventos]([animal_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_usuario_id_idx] ON [dbo].[produccion_eventos]([usuario_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_tipo_evento_idx] ON [dbo].[produccion_eventos]([tipo_evento]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_fecha_evento_idx] ON [dbo].[produccion_eventos]([fecha_evento]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [produccion_eventos_referencia_tipo_referencia_id_idx] ON [dbo].[produccion_eventos]([referencia_tipo], [referencia_id]);

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_cuentas] ADD CONSTRAINT [usuarios_cuentas_rol_id_fkey] FOREIGN KEY ([rol_id]) REFERENCES [dbo].[usuarios_roles]([rol_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_roles_permisos] ADD CONSTRAINT [usuarios_roles_permisos_rol_id_fkey] FOREIGN KEY ([rol_id]) REFERENCES [dbo].[usuarios_roles]([rol_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_roles_permisos] ADD CONSTRAINT [usuarios_roles_permisos_permiso_id_fkey] FOREIGN KEY ([permiso_id]) REFERENCES [dbo].[usuarios_permisos]([permiso_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_roles_permisos] ADD CONSTRAINT [usuarios_roles_permisos_usuario_asignador_id_fkey] FOREIGN KEY ([usuario_asignador_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_sesiones] ADD CONSTRAINT [usuarios_sesiones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[usuarios_bitacora] ADD CONSTRAINT [usuarios_bitacora_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_productos] ADD CONSTRAINT [inventario_productos_categoria_id_fkey] FOREIGN KEY ([categoria_id]) REFERENCES [dbo].[inventario_categorias]([categoria_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_existencias] ADD CONSTRAINT [inventario_existencias_inventario_id_fkey] FOREIGN KEY ([inventario_id]) REFERENCES [dbo].[inventario_almacenes]([inventario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_existencias] ADD CONSTRAINT [inventario_existencias_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_lotes] ADD CONSTRAINT [inventario_lotes_inventario_producto_id_fkey] FOREIGN KEY ([inventario_producto_id]) REFERENCES [dbo].[inventario_existencias]([inventario_producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_lotes] ADD CONSTRAINT [inventario_lotes_proveedor_id_fkey] FOREIGN KEY ([proveedor_id]) REFERENCES [dbo].[proveedores_registros]([proveedor_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[proveedores_productos] ADD CONSTRAINT [proveedores_productos_proveedor_id_fkey] FOREIGN KEY ([proveedor_id]) REFERENCES [dbo].[proveedores_registros]([proveedor_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[proveedores_productos] ADD CONSTRAINT [proveedores_productos_producto_id_fkey] FOREIGN KEY ([producto_id]) REFERENCES [dbo].[inventario_productos]([producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

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

-- AddForeignKey
ALTER TABLE [dbo].[ventas_registros] ADD CONSTRAINT [ventas_registros_cliente_id_fkey] FOREIGN KEY ([cliente_id]) REFERENCES [dbo].[clientes_registros]([cliente_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_registros] ADD CONSTRAINT [ventas_registros_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_detalles] ADD CONSTRAINT [ventas_detalles_venta_id_fkey] FOREIGN KEY ([venta_id]) REFERENCES [dbo].[ventas_registros]([venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_detalles] ADD CONSTRAINT [ventas_detalles_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ventas_recibos] ADD CONSTRAINT [ventas_recibos_venta_id_fkey] FOREIGN KEY ([venta_id]) REFERENCES [dbo].[ventas_registros]([venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_inventario_producto_id_fkey] FOREIGN KEY ([inventario_producto_id]) REFERENCES [dbo].[inventario_existencias]([inventario_producto_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_lote_inventario_id_fkey] FOREIGN KEY ([lote_inventario_id]) REFERENCES [dbo].[inventario_lotes]([lote_inventario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_proveedor_id_fkey] FOREIGN KEY ([proveedor_id]) REFERENCES [dbo].[proveedores_registros]([proveedor_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_alimentacion_detalle_id_fkey] FOREIGN KEY ([alimentacion_detalle_id]) REFERENCES [dbo].[alimentacion_detalles]([detalle_alimentacion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventario_transacciones] ADD CONSTRAINT [inventario_transacciones_aplicacion_sanitaria_id_fkey] FOREIGN KEY ([aplicacion_sanitaria_id]) REFERENCES [dbo].[sanidad_aplicaciones]([aplicacion_sanitaria_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_transacciones] ADD CONSTRAINT [produccion_transacciones_venta_detalle_id_fkey] FOREIGN KEY ([venta_detalle_id]) REFERENCES [dbo].[ventas_detalles]([detalle_venta_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_lote_produccion_id_fkey] FOREIGN KEY ([lote_produccion_id]) REFERENCES [dbo].[produccion_lotes]([lote_produccion_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_animal_id_fkey] FOREIGN KEY ([animal_id]) REFERENCES [dbo].[produccion_animales]([animal_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[produccion_eventos] ADD CONSTRAINT [produccion_eventos_usuario_id_fkey] FOREIGN KEY ([usuario_id]) REFERENCES [dbo].[usuarios_cuentas]([usuario_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;


-- FIN: SQL GENERADO POR PRISMA

-- INICIO: RESTRICCIONES PERSONALIZADAS
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

-- REGLAS DE INTEGRIDAD - VENTAS
-- ======================================================

-- Los montos principales de la venta no pueden ser negativos.
-- El descuento no puede superar el subtotal y el total debe
-- corresponder exactamente a subtotal - descuento.
ALTER TABLE [dbo].[ventas_registros]
ADD CONSTRAINT [CK_ventas_registros_montos]
CHECK (
    [subtotal] >= 0
    AND [descuento] >= 0
    AND [descuento] <= [subtotal]
    AND [total] >= 0
    AND [total] = ([subtotal] - [descuento])
);

-- Estados permitidos para una venta.
ALTER TABLE [dbo].[ventas_registros]
ADD CONSTRAINT [CK_ventas_registros_estado]
CHECK (
    [estado] IN (N'PENDIENTE', N'CONFIRMADA', N'ANULADA')
);

-- La cantidad vendida debe ser mayor que cero.
-- El precio no puede ser negativo.
-- El subtotal debe coincidir con cantidad * precio unitario.
ALTER TABLE [dbo].[ventas_detalles]
ADD CONSTRAINT [CK_ventas_detalles_valores]
CHECK (
    [cantidad_animales] > 0
    AND [precio_unitario] >= 0
    AND [subtotal] >= 0
    AND [subtotal] = ([cantidad_animales] * [precio_unitario])
);

-- El monto del recibo no puede ser negativo.
ALTER TABLE [dbo].[ventas_recibos]
ADD CONSTRAINT [CK_ventas_recibos_monto]
CHECK (
    [monto] >= 0
);

-- Estados permitidos para un recibo.
ALTER TABLE [dbo].[ventas_recibos]
ADD CONSTRAINT [CK_ventas_recibos_estado]
CHECK (
    [estado] IN (N'EMITIDO', N'ANULADO')
);

-- REGLAS DE INTEGRIDAD - INVENTARIO
-- ======================================================

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_cantidad]
CHECK (
    [cantidad] <> 0
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_tipo_cantidad]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [cantidad] > 0)
    OR
    ([tipo_transaccion] = N'SALIDA' AND [cantidad] < 0)
    OR
    ([tipo_transaccion] = N'AJUSTE' AND [cantidad] <> 0)
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_tipo]
CHECK (
    [tipo_transaccion] IN (N'INGRESO', N'SALIDA', N'AJUSTE')
);

ALTER TABLE [dbo].[inventario_transacciones]
ADD CONSTRAINT [CK_inventario_transacciones_costo]
CHECK (
    [costo_unitario] IS NULL
    OR [costo_unitario] >= 0
);


-- ======================================================
-- REGLAS DE INTEGRIDAD - PRODUCCIÓN / TRANSACCIONES
-- ======================================================

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_tipo]
CHECK (
    [tipo_transaccion] IN (N'INGRESO', N'VENTA')
);

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_cantidad]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [cantidad] > 0)
    OR
    ([tipo_transaccion] = N'VENTA' AND [cantidad] < 0)
);

ALTER TABLE [dbo].[produccion_transacciones]
ADD CONSTRAINT [CK_produccion_transacciones_venta_detalle]
CHECK (
    ([tipo_transaccion] = N'INGRESO' AND [venta_detalle_id] IS NULL)
    OR
    ([tipo_transaccion] = N'VENTA' AND [venta_detalle_id] IS NOT NULL)
);

CREATE UNIQUE INDEX [UX_produccion_transacciones_venta_detalle]
ON [dbo].[produccion_transacciones] ([venta_detalle_id])
WHERE [venta_detalle_id] IS NOT NULL;


-- ======================================================
-- REGLAS DE INTEGRIDAD - PRODUCCIÓN / EVENTOS
-- ======================================================

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_destino]
CHECK (
    [animal_id] IS NOT NULL
    OR [lote_produccion_id] IS NOT NULL
);

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_tipo]
CHECK (
    [tipo_evento] IN (
        N'MEDICION',
        N'ALIMENTACION',
        N'APLICACION_SANITARIA',
        N'CAMBIO_LOTE',
        N'CAMBIO_ESTADO'
    )
);

ALTER TABLE [dbo].[produccion_eventos]
ADD CONSTRAINT [CK_produccion_eventos_referencia]
CHECK (
    ([referencia_tipo] IS NULL AND [referencia_id] IS NULL)
    OR
    ([referencia_tipo] IS NOT NULL AND [referencia_id] IS NOT NULL)
);

-- Integridad adicional de producción
CREATE UNIQUE NONCLUSTERED INDEX
    [UX_produccion_asignaciones_lotes_animal_vigente]
ON [dbo].[produccion_asignaciones_lotes] ([animal_id])
WHERE [estado] = N'VIGENTE';

ALTER TABLE [dbo].[produccion_mediciones]
WITH CHECK
ADD CONSTRAINT [CK_produccion_mediciones_destino]
CHECK (
    ([animal_id] IS NOT NULL AND [lote_produccion_id] IS NULL)
    OR
    ([animal_id] IS NULL AND [lote_produccion_id] IS NOT NULL)
);

ALTER TABLE [dbo].[produccion_mediciones]
CHECK CONSTRAINT [CK_produccion_mediciones_destino];
-- FIN: RESTRICCIONES PERSONALIZADAS

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
