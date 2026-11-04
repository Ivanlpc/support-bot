# Support Bot

Bot de Discord en TypeScript para consultar pagos y administrar tarjetas regalo de Tebex y CraftingStore. Incluye permisos por servidor, rol y usuario, menús paginados y logs de consola. La eliminación de tarjetas de CraftingStore permanece deshabilitada hasta validar su compatibilidad real.

## Despliegue en tu VPS

La [guía de despliegue](docs/DEPLOY.md) prepara el runner self-hosted con etiqueta `support-bot`, Docker Compose y systemd. Los pushes a `main` pasan las comprobaciones en GitHub y después construyen y activan la imagen en el VPS. Un fallo de salud intenta restaurar la versión anterior. No utiliza SSH ni requiere secretos del bot en GitHub.

Después de instalar las unidades y configurar los archivos privados:

```bash
sudo systemctl start support-bot.service
sudo systemctl stop support-bot.service
sudo journalctl -u support-bot.service -f -o cat
```

Consulta también [la revisión actualizada](REVISION.md) y [el contrato HTTP](docs/API.md).

## Instalación local

Requiere Node.js 24.22.2 y MySQL o MariaDB. El esquema y las migraciones se han probado con MySQL 8.4.

1. Ejecuta `npm ci`.
2. Para una base nueva, importa `discordbot.sql`. Si ya tienes datos, guarda una copia y aplica ambas migraciones de `migrations/`.
3. Copia `.env.example` a `.env` y configura el token, la base y una clave de 16 bytes UTF-8. Al actualizar conserva exactamente la clave original.
4. Ejecuta `npm run check` y después `npm start`.
5. Invita al bot con los ámbitos `bot` y `applications.commands` y los permisos de canal necesarios. El propietario configura la tienda con `/setup` y delega acceso con `/perm`.

El bot registra comandos globales al conectarse. Los datos y las tarjetas se responden de forma privada. Solo el usuario que abrió un menú puede usarlo y las sesiones caducan a los 15 minutos.

## Configuración

`config.json` es opcional; sus opciones se mezclan con `example.config.json`, también en subcomandos. Se admite la estructura antigua `Database.shopy`. Las variables de entorno tienen prioridad. `start` y `dev` cargan `.env` si existe.

| Variable                                                  | Uso                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `DISCORD_TOKEN`                                           | Token del bot                                                |
| `ENCRYPTION_KEY`                                          | Clave de 16 bytes UTF-8; conservar la original al actualizar |
| `PREVIOUS_ENCRYPTION_KEY`                                 | Clave anterior, únicamente durante una rotación planificada  |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL                                               |
| `LOG_LEVEL`                                               | `debug`, `info`, `warn` o `error`; por defecto `info`        |
| `TEBEX_URL`, `CRAFTINGSTORE_URL`                          | Bases HTTPS de proveedores                                   |

Los permisos usan identificadores internos: `search`, `payments`, `perm`, `ban`, `giftcard.create`, `giftcard.delete` y `all`. Renombrar un comando visible no cambia sus permisos. La recuperación de tarjetas exige que estén vinculadas al usuario que la solicita.

No subas credenciales, copias ni registros de clientes al repositorio. El lockfile sí debe versionarse. Los logs se escriben en stdout/stderr; Docker los rota y systemd permite consultarlos en el journal.

## Desarrollo y comprobaciones

| Comando                                            | Resultado                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                      | TypeScript con reinicio al cambiar archivos                           |
| `npm run format`                                   | Aplica el formato común                                               |
| `npm run lint`                                     | Comprueba reglas de corrección                                        |
| `npm run typecheck`                                | Comprueba tipos, incluidas las pruebas                                |
| `npm test`                                         | Pruebas sin credenciales reales                                       |
| `npm run build`                                    | Genera dist, sin las pruebas                                          |
| `npm run check`                                    | Formato, linter, tipos, pruebas y compilación                         |
| `npm run test:database`                            | Instalación, migraciones y recifrado sobre MySQL local desechable     |
| `npm run db:migrate -- --backup-confirmed`         | Aplica migraciones a la base configurada después de guardar una copia |
| `npm run credentials:check`                        | Simula el recifrado y revierte la transacción                         |
| `npm run credentials:rotate -- --backup-confirmed` | Aplica el recifrado con la clave configurada                          |

Las herramientas de mantenimiento requieren compilar antes. La prueba SQL usa `TEST_DATABASE_URL`, crea bases con nombres aleatorios y elimina exclusivamente esas bases. Requiere un MySQL local con permisos para crear bases; no utiliza la conexión de producción del bot.

Las peticiones externas tienen un límite de 15 segundos y no se reintentan automáticamente las escrituras. La búsqueda directa de CraftingStore limita el recorrido a 100 páginas y comunica ese límite. La navegación por menús permite consultar páginas posteriores sin recorrer todo el historial.

## Actualización y credenciales

Detén el bot, respalda datos y configuración y aplica las migraciones antes de usar esta versión sobre una instalación antigua. La segunda separa creación y eliminación de tarjetas y conserva los permisos anteriores. No importes el esquema limpio sobre una base existente.

Las escrituras nuevas usan AES-GCM y las filas OFB antiguas siguen siendo legibles. El recifrado no se ejecuta automáticamente durante los despliegues. Para convertir o rotar claves, sigue [DEPLOY.md](docs/DEPLOY.md); la herramienta ofrece simulación y transacción completa. Volver a una versión antigua puede exigir restaurar también datos y claves compatibles.

## Gestión de permisos

Todos los subcomandos requieren el permiso `perm` o ser propietario del servidor. `id` permite seleccionar un usuario o un rol de Discord; `perm` se elige en la lista de permisos.

- `/perm add perm:<permiso> id:<usuario o rol>` concede un permiso directo.
- `/perm remove perm:<permiso> id:<usuario o rol>` retira ese permiso directo.
- `/perm clear id:<usuario o rol>` elimina todas las asignaciones directas de ese destinatario en el servidor actual, incluidas las antiguas inactivas.
- `/perm list id:<usuario o rol>` enumera sus asignaciones directas activas. No expande los permisos heredados de otros roles.
- `/perm search perm:<permiso>` muestra los IDs con ese permiso asignado o con `all`, agrupando las concesiones de un mismo destinatario. No enumera individualmente los miembros de un rol.

Las respuestas son privadas. Si los resultados superan el tamaño de un mensaje, se adjunta el informe completo como archivo de texto. Quitar asignaciones de un usuario no elimina las que hereda de sus roles; quitar las de un rol afecta al acceso que este concede a sus miembros. El propietario mantiene su acceso implícito.
