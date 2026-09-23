-- Catálogo aditivo. No concede permisos a cuentas ni cambia asignaciones existentes.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
INSERT INTO dbo.usuarios_permisos(codigo,nombre,modulo,accion)
SELECT P.codigo,P.nombre,N'ALIMENTACION',P.accion
FROM (VALUES
 (N'ALIMENTACION_CONCENTRADOS_CONSULTAR',N'Consultar concentrados',N'CONSULTAR'),
 (N'ALIMENTACION_RECETAS_GESTIONAR',N'Administrar concentrados y recetas',N'GESTIONAR'),
 (N'ALIMENTACION_ELABORACIONES_REGISTRAR',N'Registrar elaboraciones',N'REGISTRAR'),
 (N'ALIMENTACION_ELABORACIONES_CONSULTAR',N'Consultar elaboraciones',N'CONSULTAR'),
 (N'ALIMENTACION_ELABORACIONES_REVERTIR',N'Revertir elaboraciones',N'REVERTIR')
) P(codigo,nombre,accion)
WHERE NOT EXISTS(SELECT 1 FROM dbo.usuarios_permisos E WHERE E.codigo=P.codigo);
COMMIT TRANSACTION;
