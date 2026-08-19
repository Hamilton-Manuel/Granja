BEGIN TRY

BEGIN TRAN;

IF EXISTS (
    SELECT 1
    FROM [dbo].[produccion_asignaciones_lotes]
    WHERE [estado] = N'VIGENTE'
    GROUP BY [animal_id]
    HAVING COUNT(*) > 1
)
BEGIN
    THROW 51001,
        N'No se puede crear el índice único: existen animales con más de una asignación VIGENTE.',
        1;
END;

IF EXISTS (
    SELECT 1
    FROM [dbo].[produccion_mediciones]
    WHERE
        ([animal_id] IS NULL AND [lote_produccion_id] IS NULL)
        OR
        ([animal_id] IS NOT NULL AND [lote_produccion_id] IS NOT NULL)
)
BEGIN
    THROW 51002,
        N'No se puede crear la restricción CHECK: existen mediciones con un destino inválido.',
        1;
END;

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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

THROW;

END CATCH;
