# Granja El Chiflón

Sistema web para la administración de registros y trazabilidad de la Granja El Chiflón.

## Backend

La API utiliza Node.js, Express, TypeScript, Prisma 7 y Microsoft SQL Server. Su fundación inicial expone:

```text
GET /api/health
```

El endpoint comprueba la conexión real siguiendo el flujo Route → Controller → Service → Repository → Prisma → SQL Server.

### Configuración local

1. Copiar `.env.example` como `.env` y sustituir exclusivamente los valores de ejemplo por valores locales seguros.
2. Iniciar SQL Server con Docker Compose desde la raíz del repositorio.
3. Ejecutar desde `backend/`:

```bash
npm install
npx prisma migrate status
npx prisma generate
npm run dev
```

Variables del backend:

- `DATABASE_URL`: obligatoria; cadena de conexión de SQL Server.
- `PORT`: opcional; utiliza `3000` de forma predeterminada.
- `NODE_ENV`: `development`, `test` o `production`; utiliza `development` de forma predeterminada.

`DB_SA_PASSWORD` es consumida por Docker Compose y `DB_NAME` documenta el nombre local esperado. No deben versionarse credenciales reales.

### Validación

```bash
npm test
npm run typecheck
npm run build
npx prisma validate
npx prisma migrate status
```
