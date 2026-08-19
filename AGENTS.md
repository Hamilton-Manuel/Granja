# AGENTS.md

## Proyecto

Sistema web para la administración de registros y trazabilidad de la Granja El Chiflón, Rabinal, Baja Verapaz.

El sistema centraliza información administrativa y operativa relacionada con usuarios, clientes, proveedores, inventario, producción animal, alimentación, sanidad, ventas y reportes.

## Stack tecnológico

- Frontend: React + TypeScript.
- Backend: Node.js + Express + TypeScript.
- ORM: Prisma 7.
- Base de datos: Microsoft SQL Server.
- Desarrollo local: Docker Desktop y Docker Compose.
- Producción futura: Azure Container Apps + Azure SQL Database.
- Control de versiones: Git y GitHub.

## Estructura del repositorio

- `backend/`: API Node.js + Express + Prisma.
- `backend/src/`: código fuente del backend.
- `backend/prisma/schema.prisma`: modelo Prisma.
- `backend/prisma/migrations/`: historial de migraciones de base de datos.
- `frontend/`: aplicación React.
- `compose.yaml`: servicios locales Docker.
- `docs/`: documentación técnica.
- `scripts/`: scripts auxiliares.

---

## Arquitectura del frontend y navegación

La aplicación debe utilizar componentes reutilizables y evitar duplicar elementos comunes entre páginas.

### Layout autenticado

Una vez que el usuario haya iniciado sesión, todas las páginas internas del sistema deben utilizar un layout compartido.

Ese layout debe contener como mínimo:

- menú lateral de navegación;
- encabezado superior si corresponde;
- información básica de la sesión;
- opción para cerrar sesión;
- área donde se renderiza el contenido de cada módulo.

No copiar ni recrear manualmente el menú lateral dentro de cada página.

Crear una estructura reutilizable similar a:

```text
frontend/src/
├── components/
│   ├── layout/
│   │   ├── MenuLateral.tsx
│   │   ├── Encabezado.tsx
│   │   └── LayoutAutenticado.tsx
│   └── ui/
├── pages/
│   ├── usuarios/
│   ├── clientes/
│   ├── proveedores/
│   ├── inventario/
│   ├── produccion/
│   ├── alimentacion/
│   ├── sanidad/
│   ├── ventas/
│   └── reportes/
└── routes/
```

Todas las páginas internas deberán utilizar conceptualmente:

```tsx
<LayoutAutenticado>
  <PaginaActual />
</LayoutAutenticado>
```

`LayoutAutenticado` será responsable de mostrar, según corresponda:

```tsx
<MenuLateral />
<Encabezado />
<Contenido />
```

La pantalla de inicio de sesión no utiliza `LayoutAutenticado`.

### Menú lateral

El menú lateral debe estar disponible en todas las rutas protegidas después del inicio de sesión.

Debe contemplar los módulos principales:

- Inicio / Dashboard.
- Usuarios.
- Clientes.
- Proveedores.
- Inventario.
- Producción.
- Alimentación.
- Sanidad.
- Ventas.
- Reportes.

La visibilidad de opciones podrá depender de los permisos del usuario.

Ocultar una opción del menú no sustituye la validación de permisos en el backend.

No crear copias separadas del mismo menú para cada módulo.

Ejemplo incorrecto:

```text
MenuInventario.tsx
MenuVentas.tsx
MenuProduccion.tsx
```

Debe existir un único componente reutilizable, por ejemplo:

```text
MenuLateral.tsx
```

### Componentes reutilizables

Reutilizar componentes cuando exista comportamiento realmente común, por ejemplo:

- tablas;
- formularios;
- modales;
- botones;
- mensajes;
- indicadores;
- cargadores;
- confirmaciones;
- encabezados de página.

Evitar duplicación innecesaria de JSX entre módulos.

---

## Arquitectura MVC y organización del backend

El sistema mantiene una arquitectura basada en MVC.

- Vista: frontend React.
- Controlador: rutas y controllers de Express.
- Modelo: lógica de negocio, acceso a datos, Prisma y SQL Server.

Para mantener organizado el backend, la capa Modelo se divide internamente en `Service` y `Repository`.

El flujo general será:

```text
Vista React
    ↓
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

- `Route`: define endpoints y middleware.
- `Controller`: recibe la petición HTTP, obtiene parámetros y devuelve la respuesta.
- `Service`: implementa reglas y procesos de negocio.
- `Repository`: concentra el acceso a datos mediante Prisma.
- `Prisma`: ORM encargado de interactuar con SQL Server.

Esta separación no reemplaza MVC. `Service` y `Repository` forman parte de la organización interna de la capa Modelo.

Reglas:

- No colocar lógica de negocio compleja en controllers.
- No realizar consultas Prisma directamente desde controllers.
- Los controllers manejan HTTP y validación de entrada/salida.
- Los services contienen reglas de negocio.
- Los repositories contienen acceso a datos.
- Evitar lógica de negocio dentro de routes.
- Reutilizar código compartido cuando corresponda.
- No crear capas adicionales sin una necesidad clara.

La organización esperada por módulo será similar a:

```text
backend/src/modules/
├── salud/
│   ├── salud.routes.ts
│   ├── salud.controller.ts
│   ├── salud.service.ts
│   └── salud.repository.ts
├── usuarios/
│   ├── usuarios.routes.ts
│   ├── usuarios.controller.ts
│   ├── usuarios.service.ts
│   └── usuarios.repository.ts
├── inventario/
│   ├── inventario.routes.ts
│   ├── inventario.controller.ts
│   ├── inventario.service.ts
│   └── inventario.repository.ts
└── ventas/
    ├── ventas.routes.ts
    ├── ventas.controller.ts
    ├── ventas.service.ts
    └── ventas.repository.ts
```

### Convención del módulo de salud

El módulo interno encargado del Health Check debe utilizar nombres en español.

La carpeta y archivos serán:

```text
backend/src/modules/salud/
├── salud.routes.ts
├── salud.controller.ts
├── salud.service.ts
└── salud.repository.ts
```

Las funciones propias del módulo utilizarán el prefijo `Salud_`.

Ejemplos:

```typescript
Salud_obtenerEstado();
Salud_verificarBaseDatos();
```

Aunque internamente el módulo se denomine `salud`, el endpoint HTTP público se mantendrá como:

```text
GET /api/health
```

Se conserva `/health` por ser una convención técnica común para endpoints de comprobación de estado, mientras que el código interno mantiene la nomenclatura en español definida para el proyecto.

---

## Base de datos y Prisma

`backend/prisma/schema.prisma` y las migraciones existentes representan el modelo de datos aprobado del proyecto.

### Reglas obligatorias

- No modificar `schema.prisma` sin autorización explícita del usuario.
- No crear una nueva migración sin autorización explícita.
- No modificar migraciones que ya fueron aplicadas.
- No eliminar migraciones existentes.
- No ejecutar `prisma migrate reset` sin autorización explícita.
- No ejecutar comandos destructivos sobre la base de datos sin autorización.
- No ejecutar `docker compose down -v` sin autorización.
- No eliminar volúmenes Docker de SQL Server.
- No crear tablas manualmente si deben formar parte del modelo Prisma.
- Mantener los nombres físicos definidos con `@map` y `@@map`.
- Todas las tablas físicas conservan el prefijo de su módulo.
- Mantener `onDelete: NoAction` y `onUpdate: NoAction` donde ya fueron definidos para SQL Server.
- Revisar las migraciones existentes antes de cambiar lógica que dependa de `CHECK CONSTRAINT`, índices filtrados u otras reglas SQL personalizadas.
- No utilizar `prisma db push` como sustituto de las migraciones sin autorización.
- No usar `prisma db pull` para sobrescribir el modelo aprobado salvo que se solicite expresamente.
- No modificar manualmente datos de producción.
- Nunca asumir que un cambio en Prisma es seguro sin revisar las relaciones y restricciones existentes.

### Migraciones

Cuando se autorice modificar el modelo de datos:

1. modificar `schema.prisma`;
2. ejecutar `npx prisma validate`;
3. ejecutar `npx prisma format`;
4. volver a ejecutar `npx prisma validate`;
5. crear la migración con `--create-only`;
6. revisar `migration.sql`;
7. agregar restricciones SQL personalizadas si son necesarias;
8. aplicar la migración únicamente después de revisarla;
9. ejecutar `npx prisma migrate status`;
10. ejecutar `npx prisma generate`.

No aplicar migraciones destructivas sin autorización explícita.

---

## Datos históricos

No realizar hard delete de información histórica u operacional.

Cuando exista un campo como:

- `activo`;
- `estado`;

utilizarlo para desactivar, cerrar, finalizar o anular registros según corresponda.

No eliminar físicamente registros históricos salvo que el requerimiento lo indique expresamente.

---

## Inventario

Reglas de negocio:

- Un ingreso de inventario utiliza cantidad positiva.
- Una salida de inventario utiliza cantidad negativa.
- Un ajuste nunca puede tener cantidad cero.
- `inventario_transacciones` representa el historial de movimientos.
- `inventario_existencias` representa el saldo actual por producto y almacén.
- Los productos pueden manejar lotes o no manejar lotes.
- Si un producto no maneja lotes, `lote_inventario_id` puede ser `NULL`.
- Una actualización de existencia y su transacción correspondiente deben ejecutarse de forma atómica.
- No modificar stock sin dejar la transacción correspondiente.
- Los movimientos confirmados forman parte del historial y no deben eliminarse arbitrariamente.
- La lógica debe respetar las restricciones existentes en SQL Server.

---

## Producción

Reglas de negocio:

- Toda entrada y venta de animales se realiza mediante un lote de producción.
- Un lote de producción contiene uno o más animales.
- Una venta de un solo animal utiliza un lote que contiene un solo animal.
- Si se vende un animal individual que pertenece a un lote con varios animales, debe trasladarse primero a un lote de una unidad conservando el historial de asignaciones.
- `produccion_asignaciones_lotes` conserva el historial de pertenencia de cada animal.
- Un animal solamente puede tener una asignación `VIGENTE` al mismo tiempo.
- `produccion_transacciones` registra cambios cuantitativos del lote.
- `INGRESO` de producción utiliza cantidad positiva.
- `VENTA` de producción utiliza cantidad negativa.
- `produccion_eventos` registra sucesos que no representan movimientos cuantitativos.

Tipos principales de eventos:

- `MEDICION`
- `ALIMENTACION`
- `APLICACION_SANITARIA`
- `CAMBIO_LOTE`
- `CAMBIO_ESTADO`

No agregar `animal_id` a `produccion_transacciones`.

---

## Alimentación y sanidad

- Una asignación o registro puede corresponder a un animal o a un lote, respetando las restricciones existentes en la base de datos.
- El consumo real de productos de alimentación queda registrado en `alimentacion_detalles`.
- Las aplicaciones sanitarias pueden consumir productos de inventario.
- Los consumos deben generar las salidas de inventario correspondientes.
- No modificar existencias sin registrar la transacción de inventario.
- Las operaciones que consuman inventario deben ejecutarse de forma transaccional.
- Respetar las restricciones XOR existentes entre animal y lote.

---

## Ventas

- Toda venta se realiza mediante lotes de producción.
- `ventas_detalles` referencia `produccion_lotes`.
- No agregar `animal_id` a `ventas_detalles`.
- Una venta puede contener varios lotes.
- El número de recibo debe ser único.
- Una venta confirmada debe mantener consistencia entre venta, detalles, recibo y movimientos de producción.
- Las operaciones críticas de confirmación o anulación deben ejecutarse dentro de una transacción de base de datos.
- Una operación parcial nunca debe quedar persistida si otro paso falla.
- Una venta individual se representa mediante un lote de producción de una unidad.
- No confirmar una venta si las reglas de disponibilidad del lote no se cumplen.

---

## Transacciones

Para operaciones que afectan varias tablas utilizar transacciones Prisma.

Ejemplos:

- confirmación de venta;
- movimientos de inventario;
- registro de alimentación con consumo de inventario;
- aplicación sanitaria con consumo de inventario;
- traslado de animales entre lotes;
- actualización de existencias junto con su movimiento.

Si cualquier operación dentro del proceso falla, toda la operación debe revertirse.

No implementar procesos críticos mediante varias escrituras independientes si deben ser atómicas.

---

## Seguridad

- Nunca guardar contraseñas en texto plano.
- Utilizar hash seguro para contraseñas.
- Nunca registrar contraseñas, tokens o secretos en logs.
- Nunca mostrar `contrasena_hash` en respuestas de API.
- Nunca escribir secretos dentro del código fuente.
- No modificar ni versionar `.env`.
- No incluir credenciales de SQL Server o Azure en archivos versionados.
- Aplicar autenticación y autorización a las rutas protegidas.
- Validar permisos en backend y no depender solamente del frontend.
- Validar y sanitizar los datos recibidos.
- No devolver detalles internos sensibles de errores al cliente.
- Las rutas administrativas requieren permisos adecuados.

---

## Dependencias

- No agregar nuevas dependencias de producción sin justificar su necesidad.
- Preferir las dependencias ya instaladas cuando sean suficientes.
- No cambiar versiones importantes del stack sin autorización.
- No reemplazar Prisma, Express, React, SQL Server o Docker por otras tecnologías sin autorización explícita.
- Antes de instalar una dependencia, explicar brevemente para qué se necesita.
- Evitar dependencias redundantes.

---

## Estilo de desarrollo

- Usar TypeScript.
- Mantener `strict` habilitado.
- Evitar `any` salvo que exista una razón justificada.
- Utilizar nombres descriptivos.
- Mantener funciones pequeñas y con una responsabilidad clara.
- Evitar duplicación innecesaria.
- No hacer refactors no relacionados con la tarea solicitada.
- No modificar archivos fuera del alcance de la tarea sin necesidad.
- Las variables, funciones y métodos propios del negocio deben nombrarse en español.
- Utilizar las convenciones de nombres definidas en este documento.
- Los componentes compartidos de interfaz no deben duplicarse entre páginas.
- Mantener una estructura consistente entre los módulos.
- No considerar terminada una tarea si el proyecto no compila.

---

## Convenciones de nombres

El código desarrollado específicamente para este proyecto debe utilizar nombres en español para variables, funciones, métodos, servicios y componentes de negocio, salvo nombres impuestos por librerías, frameworks o APIs externas.

### Prefijo obligatorio por módulo en funciones

Todas las funciones y métodos propios del sistema deben incluir como prefijo el módulo al que pertenecen, incluso cuando el código ya esté organizado en carpetas separadas por módulo.

Formato obligatorio:

`Modulo_nombreFuncion`

El nombre del módulo inicia con mayúscula, seguido de guion bajo `_`, y la acción se escribe en español usando camelCase.

Prefijos oficiales:

- `Usuarios_`
- `Clientes_`
- `Proveedores_`
- `Inventario_`
- `Produccion_`
- `Alimentacion_`
- `Sanidad_`
- `Ventas_`
- `Reportes_`
- `Autenticacion_` únicamente para funcionalidad transversal de autenticación que no pertenezca específicamente al módulo Usuarios.

Ejemplos:

```typescript
async function Usuarios_iniciarSesion() {}
async function Usuarios_crearUsuario() {}
async function Usuarios_obtenerUsuarioPorId() {}
async function Usuarios_actualizarUsuario() {}

async function Clientes_crearCliente() {}
async function Clientes_buscarClientePorId() {}

async function Proveedores_crearProveedor() {}
async function Proveedores_obtenerProductosProveedor() {}

async function Inventario_registrarEntrada() {}
async function Inventario_registrarSalida() {}
async function Inventario_actualizarExistencia() {}
async function Inventario_obtenerProductos() {}

async function Produccion_crearLote() {}
async function Produccion_registrarAnimal() {}
async function Produccion_trasladarAnimalDeLote() {}

async function Alimentacion_registrarAlimentacion() {}
async function Alimentacion_asignarFormula() {}

async function Sanidad_registrarAplicacion() {}

async function Ventas_crearVenta() {}
async function Ventas_confirmarVenta() {}
async function Ventas_anularVenta() {}
async function Ventas_generarRecibo() {}

async function Reportes_generarReporteInventario() {}
async function Reportes_generarReporteVentas() {}
```

No utilizar funciones de negocio sin prefijo, por ejemplo:

```typescript
crearUsuario();
confirmarVenta();
registrarEntrada();
```

Utilizar:

```typescript
Usuarios_crearUsuario();
Ventas_confirmarVenta();
Inventario_registrarEntrada();
```

### Prefijos transversales y de infraestructura

- `Configuracion_` para carga y validación de configuración.
- `BaseDatos_` para conexión, comprobación y cierre de base de datos.
- `Servidor_` para inicio, cierre y ciclo de vida del servidor.
- `Api_` para infraestructura general de rutas y API.
- `Middleware_` para middleware transversal.
- `Salud_` para el módulo de Health Check.

Ejemplos:

```typescript
Configuracion_validarVariablesEntorno();

BaseDatos_verificarConexion();
BaseDatos_desconectar();

Servidor_iniciar();
Servidor_cerrar();

Api_configurarRutas();

Middleware_manejarErrores();
Middleware_rutaNoEncontrada();

Salud_obtenerEstado();
Salud_verificarBaseDatos();
```

Los prefijos transversales siguen la misma regla que los módulos de negocio.

No crear funciones propias del sistema sin prefijo solamente porque pertenezcan a infraestructura, configuración o middleware.

### Funciones que interactúan con varios módulos

Cuando una operación involucre varios módulos, el prefijo corresponde al módulo responsable de la operación.

Ejemplo:

```typescript
Ventas_confirmarVenta();
```

Aunque internamente la confirmación también afecte producción.

No utilizar:

```typescript
Ventas_Produccion_confirmarVenta();
Inventario_Ventas_actualizar();
```

### Funciones internas

Las funciones auxiliares privadas que contienen lógica propia del negocio también deben utilizar el prefijo del módulo.

Ejemplos:

```typescript
function Ventas_calcularSubtotal() {}
function Ventas_validarLoteDisponible() {}
function Inventario_validarExistencia() {}
```

Las funciones impuestas por Express, React, Prisma, Node.js o librerías externas no deben renombrarse artificialmente.

---

### Variables

Las variables propias del proyecto deben utilizar un prefijo que permita identificar rápidamente su tipo de dato.

Convención principal:

- `Str` para `String`.
- `Int` para números enteros.
- `Dec` para números decimales o montos.
- `Bool` para `Boolean`.
- `Dt` para `Date` o `DateTime`.
- `Arr` para arreglos.
- `Obj` para objetos.

Ejemplos:

```typescript
const StrNombre = "Hamilton";
const StrCorreo = "usuario@correo.com";

const IntCantidadAnimales = 10;
const IntUsuarioId = 5;

const DecMonto = 1250.50;
const DecPrecioUnitario = 250.00;

const BoolUsuarioActivo = true;
const BoolTienePermiso = false;

const DtFechaVenta = new Date();

const ArrUsuarios = [];
const ArrProductos = [];

const ObjCliente = {};
```

No utilizar `Int` para valores decimales.

Correcto:

```typescript
const DecMontoTotal = 1250.50;
```

Incorrecto:

```typescript
const IntMontoTotal = 1250.50;
```

Los identificadores numéricos enteros sí utilizan `Int`:

```typescript
const IntUsuarioId = 1;
const IntVentaId = 15;
```

### Parámetros

Los parámetros de funciones propias del proyecto deben utilizar las mismas convenciones cuando representen tipos simples.

Ejemplo:

```typescript
async function Usuarios_obtenerUsuarioPorId(IntUsuarioId: number) {
  // ...
}
```

### Modelos Prisma

No cambiar los nombres de modelos o campos existentes en `schema.prisma` para aplicar la convención de variables.

Por ejemplo, un campo Prisma:

```prisma
nombreCompleto String
```

no debe convertirse en:

```prisma
StrNombreCompleto String
```

Las convenciones `Str`, `Int`, `Dec`, `Bool`, `Dt`, `Arr` y `Obj` aplican principalmente al código TypeScript del proyecto.

---

## Rutas y API

- Mantener una estructura REST coherente.
- Las rutas deben agruparse por módulo.
- No colocar reglas de negocio dentro de archivos de rutas.
- Las rutas protegidas deben validar autenticación y permisos.
- Utilizar códigos HTTP apropiados.
- Mantener respuestas JSON consistentes.
- No exponer información sensible.

Ejemplo conceptual:

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

El endpoint `/api/health` pertenece internamente al módulo `salud`.

El nombre externo del endpoint no obliga a utilizar nombres en inglés para carpetas, archivos, variables o funciones internas.

---

## Manejo de errores

- Centralizar el manejo de errores del backend mediante middleware.
- No duplicar bloques de manejo de errores cuando pueda utilizarse un mecanismo común.
- Registrar información útil para diagnóstico sin incluir secretos.
- Diferenciar errores de validación, autenticación, autorización, negocio y errores internos.
- No devolver stack traces al cliente en producción.

---

## Comandos backend

Ejecutar desde `backend/`:

```bash
npm run dev
npm run typecheck
npm run build
npx prisma validate
npx prisma generate
npx prisma migrate status
```

No ejecutar comandos destructivos de Prisma o Docker sin autorización.

---

## Verificación de cambios

Antes de considerar terminada una tarea de backend:

1. Ejecutar `npm run typecheck`.
2. Ejecutar `npm run build`.
3. Ejecutar pruebas relacionadas cuando existan.
4. Si la tarea interactúa con Prisma, comprobar que Prisma Client compile correctamente.
5. Si se autorizó modificar el schema, ejecutar `npx prisma validate`.
6. Revisar que no se hayan agregado secretos al repositorio.
7. Revisar `git diff`.
8. Informar los archivos creados y modificados.
9. No declarar la tarea terminada si existen errores de compilación, errores de tipos o pruebas fallidas.

Para frontend, cuando ya exista:

1. ejecutar el typecheck correspondiente;
2. ejecutar build;
3. comprobar rutas principales;
4. comprobar layout autenticado;
5. comprobar que el menú lateral no esté duplicado;
6. comprobar permisos cuando correspondan.

---

## Forma de trabajo con Codex

Antes de cambios grandes o que afecten varios módulos:

- leer primero `AGENTS.md`;
- revisar los archivos relacionados;
- revisar el modelo Prisma y las migraciones relevantes;
- presentar un plan breve antes de implementar cuando la tarea sea compleja;
- no asumir requisitos de negocio que no estén documentados;
- detenerse y solicitar autorización si una decisión puede cambiar el modelo de datos o la arquitectura.

Para tareas pequeñas y claramente definidas puede implementar directamente respetando las reglas de este documento.

Al finalizar una tarea informar:

- archivos creados;
- archivos modificados;
- decisiones importantes;
- comandos ejecutados;
- resultados de validación;
- pruebas ejecutadas;
- cualquier punto pendiente;
- cualquier riesgo detectado.

No modificar `schema.prisma`, migraciones existentes, secretos, configuración destructiva de Docker o arquitectura principal sin autorización explícita.
