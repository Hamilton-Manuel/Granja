BEGIN TRY

BEGIN TRAN;

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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [clientes_registros_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_registros_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [proveedores_registros_pkey] PRIMARY KEY CLUSTERED ([proveedor_id])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_categorias] (
    [categoria_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(150) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [inventario_categorias_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_categorias_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_productos_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_almacenes_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_existencias_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [inventario_existencias_pkey] PRIMARY KEY CLUSTERED ([inventario_producto_id]),
    CONSTRAINT [inventario_existencias_inventario_id_producto_id_key] UNIQUE NONCLUSTERED ([inventario_id],[producto_id])
);

-- CreateTable
CREATE TABLE [dbo].[inventario_lotes] (
    [lote_inventario_id] INT NOT NULL IDENTITY(1,1),
    [inventario_producto_id] INT NOT NULL,
    [proveedor_id] INT,
    [codigo_lote] NVARCHAR(100) NOT NULL,
    [fecha_ingreso] DATETIME2 NOT NULL CONSTRAINT [inventario_lotes_fecha_ingreso_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_fabricacion] DATE,
    [fecha_vencimiento] DATE,
    [costo_unitario] DECIMAL(18,4),
    [existencia_actual] DECIMAL(18,4) NOT NULL CONSTRAINT [inventario_lotes_existencia_actual_df] DEFAULT 0,
    [activo] BIT NOT NULL CONSTRAINT [inventario_lotes_activo_df] DEFAULT 1,
    [observaciones] NVARCHAR(1000),
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [inventario_lotes_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [inventario_lotes_pkey] PRIMARY KEY CLUSTERED ([lote_inventario_id])
);

-- CreateTable
CREATE TABLE [dbo].[proveedores_productos] (
    [proveedor_producto_id] INT NOT NULL IDENTITY(1,1),
    [proveedor_id] INT NOT NULL,
    [producto_id] INT NOT NULL,
    [precio_referencia] DECIMAL(18,4),
    [activo] BIT NOT NULL CONSTRAINT [proveedores_productos_activo_df] DEFAULT 1,
    [fecha_relacion] DATETIME2 NOT NULL CONSTRAINT [proveedores_productos_fecha_relacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [proveedores_productos_pkey] PRIMARY KEY CLUSTERED ([proveedor_producto_id]),
    CONSTRAINT [proveedores_productos_proveedor_id_producto_id_key] UNIQUE NONCLUSTERED ([proveedor_id],[producto_id])
);

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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
