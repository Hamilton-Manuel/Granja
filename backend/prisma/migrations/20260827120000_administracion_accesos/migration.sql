ALTER TABLE [usuarios_roles] ADD [es_reservado] BIT NOT NULL CONSTRAINT [usuarios_roles_es_reservado_df] DEFAULT 0;
ALTER TABLE [usuarios_cuentas] ADD [version_accesos] INT NOT NULL CONSTRAINT [usuarios_cuentas_version_accesos_df] DEFAULT 0;
ALTER TABLE [usuarios_cuentas] ADD [es_protegida] BIT NOT NULL CONSTRAINT [usuarios_cuentas_es_protegida_df] DEFAULT 0;

CREATE TABLE [usuarios_permisos_directos] (
  [permiso_directo_id] INT NOT NULL IDENTITY(1,1), [usuario_id] INT NOT NULL,
  [permiso_id] INT NOT NULL, [efecto] NVARCHAR(10) NOT NULL, [asignado_por_usuario_id] INT NOT NULL,
  [fecha_creacion] DATETIME2(7) NOT NULL CONSTRAINT [usuarios_permisos_directos_fecha_creacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
  [fecha_actualizacion] DATETIME2(7) NOT NULL CONSTRAINT [usuarios_permisos_directos_fecha_actualizacion_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
  CONSTRAINT [usuarios_permisos_directos_pkey] PRIMARY KEY ([permiso_directo_id]),
  CONSTRAINT [usuarios_permisos_directos_efecto_ck] CHECK ([efecto] IN ('ALLOW','DENY')),
  CONSTRAINT [usuarios_permisos_directos_usuario_permiso_key] UNIQUE ([usuario_id],[permiso_id]),
  CONSTRAINT [usuarios_permisos_directos_usuario_fk] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios_cuentas]([usuario_id]),
  CONSTRAINT [usuarios_permisos_directos_permiso_fk] FOREIGN KEY ([permiso_id]) REFERENCES [usuarios_permisos]([permiso_id]),
  CONSTRAINT [usuarios_permisos_directos_actor_fk] FOREIGN KEY ([asignado_por_usuario_id]) REFERENCES [usuarios_cuentas]([usuario_id])
);
CREATE INDEX [usuarios_permisos_directos_permiso_idx] ON [usuarios_permisos_directos]([permiso_id]);
CREATE INDEX [usuarios_permisos_directos_actor_idx] ON [usuarios_permisos_directos]([asignado_por_usuario_id]);

CREATE TABLE [usuarios_accesos_eventos] (
  [acceso_evento_id] INT NOT NULL IDENTITY(1,1), [usuario_id] INT NOT NULL, [actor_usuario_id] INT NOT NULL,
  [tipo] NVARCHAR(30) NOT NULL, [permiso_id] INT NULL, [rol_anterior_id] INT NULL, [rol_nuevo_id] INT NULL,
  [estado_anterior] NVARCHAR(10) NULL, [estado_nuevo] NVARCHAR(10) NULL,
  [fecha] DATETIME2(7) NOT NULL CONSTRAINT [usuarios_accesos_eventos_fecha_df] DEFAULT CONVERT(datetime2(7), (SYSUTCDATETIME() AT TIME ZONE 'UTC') AT TIME ZONE 'Central America Standard Time'),
  [direccion_ip] NVARCHAR(45) NULL,
  CONSTRAINT [usuarios_accesos_eventos_pkey] PRIMARY KEY ([acceso_evento_id]),
  CONSTRAINT [usuarios_accesos_eventos_tipo_ck] CHECK (([tipo]='CAMBIO_ROL' AND [permiso_id] IS NULL AND [rol_anterior_id] IS NOT NULL AND [rol_nuevo_id] IS NOT NULL AND [estado_anterior] IS NULL AND [estado_nuevo] IS NULL) OR ([tipo]='CAMBIO_OVERRIDE' AND [permiso_id] IS NOT NULL AND [rol_anterior_id] IS NULL AND [rol_nuevo_id] IS NULL AND [estado_anterior] IS NOT NULL AND [estado_nuevo] IS NOT NULL)),
  CONSTRAINT [usuarios_accesos_eventos_estado_anterior_ck] CHECK ([estado_anterior] IS NULL OR [estado_anterior] IN ('HEREDAR','PERMITIR','DENEGAR')),
  CONSTRAINT [usuarios_accesos_eventos_estado_nuevo_ck] CHECK ([estado_nuevo] IS NULL OR [estado_nuevo] IN ('HEREDAR','PERMITIR','DENEGAR')),
  CONSTRAINT [usuarios_accesos_eventos_usuario_fk] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios_cuentas]([usuario_id]),
  CONSTRAINT [usuarios_accesos_eventos_actor_fk] FOREIGN KEY ([actor_usuario_id]) REFERENCES [usuarios_cuentas]([usuario_id]),
  CONSTRAINT [usuarios_accesos_eventos_permiso_fk] FOREIGN KEY ([permiso_id]) REFERENCES [usuarios_permisos]([permiso_id])
  ,CONSTRAINT [usuarios_accesos_eventos_rol_anterior_fk] FOREIGN KEY ([rol_anterior_id]) REFERENCES [usuarios_roles]([rol_id])
  ,CONSTRAINT [usuarios_accesos_eventos_rol_nuevo_fk] FOREIGN KEY ([rol_nuevo_id]) REFERENCES [usuarios_roles]([rol_id])
);
CREATE INDEX [usuarios_accesos_eventos_usuario_fecha_idx] ON [usuarios_accesos_eventos]([usuario_id],[fecha]);
CREATE INDEX [usuarios_accesos_eventos_actor_idx] ON [usuarios_accesos_eventos]([actor_usuario_id]);
CREATE INDEX [usuarios_accesos_eventos_permiso_idx] ON [usuarios_accesos_eventos]([permiso_id]);

EXEC sys.sp_executesql N'UPDATE [usuarios_roles] SET [es_reservado]=1 WHERE [nombre]=N''WEBMASTER'';';
EXEC sys.sp_executesql N'UPDATE C SET C.[es_protegida]=1 FROM [usuarios_cuentas] C INNER JOIN [usuarios_roles] R ON R.[rol_id]=C.[rol_id] WHERE R.[nombre]=N''WEBMASTER'';';
