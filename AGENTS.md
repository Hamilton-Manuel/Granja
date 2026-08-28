# AGENTS.md

## Proyecto

Sistema web para la administración de registros y trazabilidad de la Granja El Chiflón, Rabinal, Baja Verapaz, Guatemala.

Módulos principales: Usuarios, Clientes, Proveedores, Inventario, Producción, Alimentación, Sanidad, Ventas y Reportes.

## Stack

- Frontend: React + TypeScript + Vite + React Router.
- Backend: Node.js + Express + TypeScript + Prisma 7.
- Base de datos: Microsoft SQL Server.
- Desarrollo local: Docker Desktop / Docker Compose.
- Producción futura: Azure Container Apps + Azure SQL Database.
- Control de versiones: Git + GitHub.

---

# 1. Forma de trabajo con Codex

## Uso eficiente del contexto

Trabajar únicamente con los archivos necesarios para la tarea actual.

- No recorrer todo el repositorio sin necesidad.
- No leer archivos completos si una búsqueda puntual es suficiente.
- No volver a investigar decisiones ya evidentes en el código.
- Preferir `git status --short` y `git diff` focalizado.
- Evitar logs extensos innecesarios.
- No repetir pruebas costosas si no cambió código relacionado.
- Entregar resultados finales breves.
- No generar planes largos para tareas pequeñas y claramente definidas.
- Para cambios complejos o que afecten arquitectura/modelo, presentar un plan breve.
- No hacer refactors no relacionados con la tarea solicitada.

## Git

Codex NO debe ejecutar salvo autorización explícita:

- `git add`
- `git commit`
- `git push`

El usuario realiza normalmente estas acciones manualmente después de validar.

No considerar una tarea terminada si existen errores de compilación, TypeScript, pruebas o Prisma relacionados con el cambio.

---

# 2. Arquitectura backend

Mantener el flujo:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma
  ↓
SQL Server
```

Responsabilidades:

- Route: endpoints y middleware.
- Controller: HTTP, parámetros y respuesta.
- Service: reglas de negocio.
- Repository: acceso a datos.
- Prisma: acceso ORM a SQL Server.

Reglas:

- No consultar Prisma directamente desde controllers.
- No colocar lógica de negocio compleja en controllers.
- No colocar reglas de negocio en routes.
- Reutilizar services, repositories y primitivas existentes cuando corresponda.
- No crear capas adicionales sin necesidad clara.

---

# 3. Arquitectura frontend

Todas las páginas autenticadas reutilizan el layout compartido existente.

Reutilizar cuando corresponda:

- `LayoutAutenticado`
- `MenuLateral`
- encabezado compartido
- componentes UI existentes
- `Autocomplete` compartido
- helpers de fecha
- helpers Decimal/monetarios
- infraestructura API existente

No duplicar menús ni componentes equivalentes por módulo.

La visibilidad y acceso a acciones depende de PERMISOS, no del nombre del rol.

Nunca autorizar así:

```text
role === "ADMINISTRADOR"
role === "OPERADOR"
role === "WEBMASTER"
```

Ocultar una acción en frontend NO sustituye autorización backend.

---

# 4. Convenciones de nombres

El código propio del proyecto utiliza nombres en español.

Funciones de negocio:

```text
Modulo_nombreFuncion
```

Prefijos principales:

- `Usuarios_`
- `Clientes_`
- `Proveedores_`
- `Inventario_`
- `Produccion_`
- `Alimentacion_`
- `Sanidad_`
- `Ventas_`
- `Reportes_`

Infraestructura:

- `Autenticacion_`
- `Configuracion_`
- `BaseDatos_`
- `Servidor_`
- `Api_`
- `Middleware_`
- `Salud_`
- `Fecha_`

Variables TypeScript propias del proyecto:

- `Str`: String
- `Int`: integer
- `Dec`: Decimal/monto
- `Bool`: Boolean
- `Dt`: Date/DateTime
- `Arr`: Array
- `Obj`: Object

No renombrar campos ni modelos Prisma para aplicar estos prefijos.

Mantener TypeScript `strict` y evitar `any` salvo justificación real.

---

# 5. Prisma y base de datos

`backend/prisma/schema.prisma` y las migraciones representan el modelo aprobado.

NO hacer sin autorización explícita:

- modificar `schema.prisma`;
- crear migraciones;
- modificar migraciones aplicadas;
- eliminar migraciones;
- ejecutar `prisma migrate reset`;
- ejecutar `prisma db push`;
- ejecutar `docker compose down -v`;
- eliminar volúmenes Docker;
- modificar datos reales arbitrariamente.

Cuando se autorice una modificación de modelo:

1. modificar `schema.prisma`;
2. `npx prisma validate`;
3. `npx prisma format`;
4. validar nuevamente;
5. crear migración `--create-only` cuando sea posible;
6. revisar manualmente `migration.sql`;
7. agregar SQL personalizado necesario;
8. validar sobre BD temporal reconstruida desde cero;
9. aplicar a BD real únicamente con autorización;
10. `npx prisma migrate status`;
11. `npx prisma generate`.

No utilizar `db push` como sustituto de migraciones.

Mantener nombres físicos `@map` / `@@map`, prefijos de tablas por módulo y reglas SQL Server existentes.

---

# 6. Política temporal

Zona funcional:

```text
America/Guatemala
```

SQL Server:

```text
Central America Standard Time
```

Reglas:

- `DATETIME2(7)` representa hora civil de Guatemala.
- `DATE` representa fecha civil sin timezone.
- Utilizar infraestructura `Fecha_`.
- No sumar ni restar 6 horas manualmente.
- No depender del timezone del host.
- No usar `toISOString()` directamente sobre DATETIME2 Guatemala si cambia su significado.
- No usar `@default(now())` ni `@updatedAt` para nuevos campos temporales del dominio.

## Fechas generadas automáticamente por SQL Server

Únicamente cuando SQL Server deba generar automáticamente un timestamp, utilizar
un DEFAULT que obtenga la hora civil de Guatemala:

```sql
CONVERT(
    datetime2(7),
    (SYSUTCDATETIME() AT TIME ZONE 'UTC')
        AT TIME ZONE 'Central America Standard Time'
)

---

# 7. Datos históricos y transacciones

No realizar hard delete de información histórica u operacional.

Preferir estados como ACTIVO/INACTIVO, CONFIRMADO/ANULADO, VIGENTE/FINALIZADO o equivalentes.

Toda operación que afecte varias tablas y deba ser atómica debe utilizar una transacción Prisma.

Ejemplos:

- movimientos de inventario;
- transferencias;
- alimentación con consumo;
- sanidad con consumo;
- venta;
- reversión de venta;
- traslado de animales.

Si una etapa falla, no debe persistir una operación parcial.

Cuando ya exista un `Prisma.TransactionClient`, reutilizar primitivas `ConTx` y NO abrir transacciones anidadas.

---

# 8. Usuarios y seguridad

Autenticación existente:

- sesiones opacas en BD;
- token aleatorio;
- hash SHA-256 del token almacenado;
- cookie HttpOnly;
- SameSite Strict;
- Secure en producción;
- duración absoluta definida por backend;
- Argon2id para contraseñas.

No almacenar tokens en `localStorage` ni `sessionStorage`.

No leer manualmente cookies de sesión desde frontend.

Nunca:

- guardar contraseñas en texto plano;
- registrar secretos/tokens/contraseñas;
- exponer hashes;
- versionar `.env`;
- introducir credenciales en código.

WEBMASTER es rol reservado/protegido.

No crear bypasses por nombre de rol.

---

# 9. Inventario

Inventario representa INSUMOS operativos, no animales de producción.

Ejemplos: alimentación, concentrados, medicamentos, vitaminas, productos sanitarios y materiales operativos.

Los animales pertenecen a Producción.

## Movimientos

- ingreso: cantidad positiva;
- salida: cantidad negativa;
- ajuste: nunca cero.

`inventario_transacciones` es autoridad histórica.

`inventario_existencias` mantiene saldo materializado.

Toda modificación de saldo debe tener su transacción correspondiente.

Movimientos confirmados no se eliminan; las correcciones utilizan reversión vinculada.

## Lotes

Un producto puede manejar o no lotes.

Los lotes de Inventario son distintos de los lotes de Producción.

Cuando un producto maneja lote:

- selección explícita;
- costo exacto del lote;
- vencimiento cuando aplique.

No usar FIFO/FEFO automáticamente salvo requerimiento futuro explícito.

## Costos

Usar `Prisma.Decimal` / Decimal exacto.

No usar `Number`/float como autoridad monetaria.

Productos sin lotes mantienen costo promedio materializado según la lógica existente.

## Unidad de medida

Actualmente cada producto posee UNA unidad base para existencias y movimientos.

La unidad debe normalizarse desde un catálogo/select de frontend y NO mediante texto libre.

Valores iniciales normalizados:

Peso:
- `kg`
- `g`
- `lb`
- `oz`
- `t`

Volumen:
- `L`
- `mL`

Unidad:
- `unidad`

IMPORTANTE: actualmente NO existen conversiones automáticas entre unidades.

Ejemplo futuro pendiente:

```text
compra en toneladas
↓
conversión
↓
existencia/consumo en libras
```

No implementar conversiones sin un requerimiento específico y cambio de modelo autorizado.

---

# 10. Producción

Producción utiliza censo individual obligatorio.

Cada animal:

- posee identificación propia;
- pertenece históricamente a lotes;
- si está ACTIVO debe tener exactamente una asignación VIGENTE;
- puede cambiar de lote conservando historial.

Estados principales:

- ACTIVO
- VENDIDO
- FALLECIDO
- RETIRADO

Un lote puede contener múltiples animales.

Un lote puede permanecer ACTIVO aunque quede vacío.

NO cerrar automáticamente un lote por vender su último animal.

## Venta de animales

IMPORTANTE: NO es necesario trasladar un animal a un lote unitario para venderlo.

Ventas puede seleccionar animales exactos directamente desde sus lotes actuales.

Una venta puede incluir:

- un animal;
- varios animales del mismo lote;
- animales de múltiples lotes;
- animales de diferentes tipos.

La venta conserva el lote de origen de cada animal.

`produccion_asignaciones_lotes` conserva el historial.

Las operaciones de venta/reversión utilizan las primitivas transaccionales existentes de Producción.

---

# 11. Alimentación

Una alimentación puede aplicarse directamente a un animal o globalmente a un lote.

Una alimentación de lote NO distribuye artificialmente consumo/costo entre cada animal.

El consumo real genera salidas de Inventario.

Puede consumir múltiples productos y fuentes físicas.

Las fórmulas son plantillas editables, no autoridad histórica del consumo.

Los registros confirmados son inmutables y las correcciones utilizan reversión completa.

---

# 12. Sanidad

Una aplicación sanitaria puede corresponder a un animal o globalmente a un lote.

Una aplicación de lote NO distribuye artificialmente cantidad/costo entre animales.

Puede consumir productos de Inventario, pero un procedimiento puede no consumir productos.

La dosis clínica es independiente de la cantidad física consumida en inventario.

Cada detalle clínico puede registrar producto, dosis, unidad clínica, vía de administración, alcance y fuentes físicas de inventario.

Registros confirmados son inmutables; correcciones mediante reversión completa.

---

# 13. Ventas

Ventas trabaja con ANIMALES EXACTOS.

Estructura conceptual:

```text
ventas_registros
  ├── ventas_recibos
  └── ventas_detalles
        └── ventas_detalles_animales
```

`ventas_registros`: maestro de venta.

`ventas_detalles`: agrupación por lote de origen.

`ventas_detalles_animales` conserva los animales exactos vendidos, precio individual y referencias históricas necesarias para reversión.

## Reglas

Una venta puede incluir:

- un animal;
- varios animales;
- múltiples lotes;
- múltiples tipos animales.

Cada animal posee su propio `precioVenta`.

`precioVenta > 0`.

No existe descuento en Ventas v1.

El total es la suma exacta de precios individuales.

No usar float/Number como autoridad monetaria.

Cliente activo obligatorio.

Consumidor Final es un cliente real seleccionable.

Formas de pago cerradas:

- EFECTIVO
- TRANSFERENCIA
- DEPOSITO
- CREDITO

No existen pagos parciales en v1.

Una venta se confirma directamente; no existen borradores.

## Recibo

Documento actual: `RECIBO`.

El recibo almacena por separado:

```text
serie
numero
```

Ejemplo físico:

```text
serie = A
numero = 1
```

Presentación frontend:

```text
A-000001
```

Nunca usar un campo concatenado como autoridad.

`(serie, numero)` debe ser único.

El número es generado de forma segura por backend/SQL.

Una reversión:

- NO reutiliza número;
- conserva serie/número;
- marca venta ANULADA;
- marca recibo ANULADO.

Actualmente la serie estructural inicial es `A`.

PENDIENTE FUTURO: administración de series por tipo de documento mediante configuración persistida. No implementar esa administración salvo solicitud expresa.

## Reversión

Una venta confirmada es inmutable.

La corrección se realiza mediante reversión completa.

Al revertir:

- animales vuelven a ACTIVO si las reglas lo permiten;
- se crean nuevas asignaciones vigentes al lote original;
- no se revive artificialmente la asignación histórica cerrada;
- el lote original debe estar ACTIVO;
- Ventas NO reabre lotes automáticamente.

---

# 14. PDF de recibos

Frontend utiliza:

- `jspdf`
- `jspdf-autotable`

El PDF se genera desde datos estructurados.

No usar capturas del DOM como autoridad.

La misma venta debe producir el mismo recibo desde resultado, historial, detalle, vista de recibo y descarga PDF.

Las ventas anuladas conservan recibo histórico con indicación:

```text
RECIBO ANULADO
```

---

# 15. API y permisos

Mantener rutas REST agrupadas por módulo.

Ejemplos:

```text
/api/health
/api/usuarios
/api/clientes
/api/proveedores
/api/inventario
/api/produccion
/api/alimentacion
/api/sanidad
/api/ventas
/api/reportes
```

No inventar endpoints antes de revisar los existentes.

Para frontend, el backend real es la fuente de verdad del contrato.

Nunca usar nombres de roles para autorizar funcionalidad; evaluar permisos explícitos.

---

# 16. Dependencias

No agregar dependencias sin necesidad real.

Antes de instalar:

- revisar si ya existe funcionalidad equivalente;
- justificar brevemente la dependencia.

No realizar upgrades mayores del stack sin autorización.

No ejecutar:

```text
npm audit fix --force
```

sin autorización.

Si `npm audit` muestra vulnerabilidades transitivas conocidas de tooling y la corrección propuesta implica downgrade/upgrade incompatible, reportarlas y no forzar cambios.

---

# 17. Pruebas y validación

Para frontend, según corresponda:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Ejecutar `npm audit` cuando se agreguen dependencias, cambie `package-lock` o sea necesario validar seguridad de dependencias.

Para backend:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Cuando corresponda Prisma:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

No ejecutar mutaciones reales únicamente para probar una UI salvo autorización.

Preferir tests, mocks, BD temporal para integración y consultas de solo lectura.

---

# 18. Finalización de tareas

Al finalizar informar brevemente:

1. archivos creados;
2. archivos modificados;
3. funcionalidad implementada;
4. pruebas ejecutadas;
5. resultados de typecheck/build;
6. cambios de BD si hubo;
7. problemas pendientes.

No hacer commit ni push salvo autorización explícita.

No declarar terminado si existen errores relevantes.
