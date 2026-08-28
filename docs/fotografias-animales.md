# Fotografías de animales

El contenedor Blob `animales` es privado. En desarrollo se inicia Azurite con `docker compose up -d azurite`; el volumen nombrado `azurite_data` conserva los blobs después de `docker compose down`.

El backend ejecutado en Windows usa `AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true`. Si posteriormente se ejecuta dentro de Compose, debe usarse la cadena explícita de Azurite con `BlobEndpoint=http://azurite:10000/devstoreaccount1` y las credenciales estándar de desarrollo.

En Azure Container Apps se configura únicamente `AZURE_STORAGE_ACCOUNT_URL=https://<cuenta>.blob.core.windows.net`. La identidad administrada del sistema requiere el rol `Storage Blob Data Contributor`; `AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID` se define solo al emplear una identidad asignada por usuario. Nunca deben configurarse simultáneamente URL y cadena de conexión.

Contratos preparados:

- `POST /api/produccion/animales/:animalId/foto`, multipart con un campo `foto`, permiso `PRODUCCION_ANIMALES_EDITAR`.
- `GET /api/produccion/animales/:animalId/foto`, permiso `PRODUCCION_CONSULTAR`, entrega privada de `image/webp` con ETag.

Los reemplazos conservan la fila y el blob anteriores. No existe eliminación ni galería en esta versión.
