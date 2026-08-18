BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[usuarios_roles] (
    [rol_id] INT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(500),
    [activo] BIT NOT NULL CONSTRAINT [usuarios_roles_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_roles_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_permisos_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
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
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_cuentas_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
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
    [fecha_asignacion] DATETIME2 NOT NULL CONSTRAINT [usuarios_roles_permisos_fecha_asignacion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [usuarios_roles_permisos_pkey] PRIMARY KEY CLUSTERED ([rol_permiso_id]),
    CONSTRAINT [usuarios_roles_permisos_rol_id_permiso_id_key] UNIQUE NONCLUSTERED ([rol_id],[permiso_id])
);

-- CreateTable
CREATE TABLE [dbo].[usuarios_sesiones] (
    [sesion_id] INT NOT NULL IDENTITY(1,1),
    [usuario_id] INT NOT NULL,
    [token] NVARCHAR(500) NOT NULL,
    [fecha_inicio] DATETIME2 NOT NULL CONSTRAINT [usuarios_sesiones_fecha_inicio_df] DEFAULT CURRENT_TIMESTAMP,
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
    [fecha] DATETIME2 NOT NULL CONSTRAINT [usuarios_bitacora_fecha_df] DEFAULT CURRENT_TIMESTAMP,
    [direccion_ip] NVARCHAR(45),
    CONSTRAINT [usuarios_bitacora_pkey] PRIMARY KEY CLUSTERED ([bitacora_id])
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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
