ALTER TABLE [dbo].[produccion_mediciones] ADD
    [metodo_obtencion] NVARCHAR(40),
    [perimetro_toracico_cm] DECIMAL(10,4),
    [longitud_corporal_cm] DECIMAL(10,4);

EXEC sys.sp_executesql N'
ALTER TABLE [dbo].[produccion_mediciones]
WITH CHECK
ADD CONSTRAINT [CK_produccion_mediciones_metodo]
CHECK (
    ([metodo_obtencion] IS NULL AND [perimetro_toracico_cm] IS NULL AND [longitud_corporal_cm] IS NULL)
    OR
    (
        [metodo_obtencion] IS NOT NULL
        AND
        (
            ([metodo_obtencion] = N''BASCULA'' AND [perimetro_toracico_cm] IS NULL AND [longitud_corporal_cm] IS NULL)
            OR
            (
                [metodo_obtencion] = N''ESTIMACION_SCHAEFFER''
                AND [perimetro_toracico_cm] IS NOT NULL
                AND [longitud_corporal_cm] IS NOT NULL
                AND [perimetro_toracico_cm] > 0
                AND [longitud_corporal_cm] > 0
            )
        )
    )
);';

ALTER TABLE [dbo].[produccion_mediciones]
CHECK CONSTRAINT [CK_produccion_mediciones_metodo];
