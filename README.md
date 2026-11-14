# Support Bot

Bot de Discord en TypeScript para consultar pagos y administrar tarjetas regalo de Tebex. Incluye permisos por servidor, rol y usuario, menús paginados y logs de consola.

El bot utiliza siempre español. El idioma no se configura por servidor ni se guarda en MySQL.

Cuando un usuario abandona el servidor, se eliminan sus permisos directos del bot en ese servidor. Activa **Server Members Intent** en Discord Developer Portal → tu aplicación → Bot → Privileged Gateway Intents antes de iniciar esta versión. También se procesan las salidas de miembros que el bot no tiene en caché.

## Despliegue en tu VPS

La [guía de despliegue](docs/DEPLOY.md) prepara un runner self-hosted con etiqueta support-bot. El workflow hace checkout, construye la imagen y la ejecuta con docker run. Las credenciales se obtienen de GitHub Secrets, se guardan en /opt/support-bot/.env y se cargan al arrancar. Código, configuración y logs permanecen bajo /opt/support-bot.

Para consultar los logs:

```bash
docker logs -f --tail 100 support-bot
tail -f /opt/support-bot/logs/app.log
```

Consulta también [la revisión actualizada](REVISION.md) y [el contrato HTTP](docs/API.md).

## Instalación local

Requiere Node.js 24.22.2 y MySQL o MariaDB. El esquema inicial se comprueba con MySQL 8.4.

1. Ejecuta `npm ci`.
2. Crea una base de datos vacía e importa `discordbot.sql` una sola vez.
3. Copia `.env.example` a `.env` y configura el token, la base y una clave de 16 bytes UTF-8. Guarda la clave de cifrado en un lugar seguro.
4. Ejecuta `npm run check` y después `npm start`.
5. Invita al bot con los ámbitos `bot` y `applications.commands` y los permisos de canal necesarios. El propietario o un administrador configura Tebex con `/setup`. El propietario delega acceso con `/perm`.

El bot registra comandos globales al conectarse. Los datos y las tarjetas se responden de forma privada. Solo el usuario que abrió un menú puede usarlo y las sesiones caducan a los 15 minutos.

## Configuración

`config.json` es opcional; sus opciones se mezclan con `example.config.json`, también en subcomandos. Las variables de entorno tienen prioridad. `start` y `dev` cargan `.env` si existe.

| Variable                                                  | Uso                                                   |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `DISCORD_TOKEN`                                           | Token del bot                                         |
| `ENCRYPTION_KEY`                                          | Clave de 16 bytes UTF-8; guardar de forma segura      |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL                                        |
| `LOG_LEVEL`                                               | `debug`, `info`, `warn` o `error`; por defecto `info` |
| `TEBEX_URL`                                               | Base HTTPS de Tebex                                   |

Los permisos usan identificadores internos: `search`, `payments`, `perm`, `ban`, `giftcard.create`, `giftcard.delete` y `all`. Renombrar un comando visible no cambia sus permisos. La recuperación de tarjetas exige que estén vinculadas al usuario que la solicita.

No subas credenciales, copias ni registros de clientes al repositorio. El lockfile sí debe versionarse. Los logs se escriben en stdout/stderr y, con LOG_DIR configurado, en logs/app.log con rotación. Docker también permite consultarlos con docker logs.

## Desarrollo y comprobaciones

| Comando                 | Resultado                                               |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | TypeScript con reinicio al cambiar archivos             |
| `npm run format`        | Aplica el formato común                                 |
| `npm run lint`          | Comprueba reglas de corrección                          |
| `npm run typecheck`     | Comprueba tipos, incluidas las pruebas                  |
| `npm test`              | Pruebas sin credenciales reales                         |
| `npm run build`         | Genera dist, sin las pruebas                            |
| `npm run check`         | Formato, linter, tipos, pruebas y compilación           |
| `npm run test:database` | Esquema inicial y permisos sobre MySQL local desechable |

La prueba de base de datos requiere compilar antes. La prueba SQL usa `TEST_DATABASE_URL`, crea bases con nombres aleatorios y elimina exclusivamente esas bases. Requiere un MySQL local con permisos para crear bases; no utiliza la conexión de producción del bot.

Las peticiones externas tienen un límite de 15 segundos y no se reintentan automáticamente las escrituras. La navegación por menús permite consultar páginas posteriores sin recorrer todo el historial.

## Cifrado de credenciales

Los tokens de las tiendas se almacenan con AES-128-GCM y una clave de 16 bytes UTF-8. Cada token utiliza un IV aleatorio y una etiqueta de autenticación. Conserva ENCRYPTION_KEY: es necesaria para leer los tokens guardados. Las credenciales se cargan durante la ejecución y no se incluyen en la imagen Docker.

## Gestión de permisos

Todos los subcomandos requieren el permiso `perm` o ser propietario del servidor. `id` permite seleccionar un usuario o un rol de Discord; `perm` se elige en la lista de permisos.

- `/perm add perm:<permiso> id:<usuario o rol>` concede un permiso directo.
- `/perm remove perm:<permiso> id:<usuario o rol>` retira ese permiso directo.
- `/perm clear id:<usuario o rol>` elimina todas las asignaciones directas de ese destinatario en el servidor actual.
- `/perm list id:<usuario o rol>` enumera sus asignaciones directas. No expande los permisos heredados de otros roles.
- `/perm search perm:<permiso>` muestra los IDs con ese permiso asignado o con `all`, agrupando las concesiones de un mismo destinatario. No enumera individualmente los miembros de un rol.

Las respuestas son privadas. Si los resultados superan el tamaño de un mensaje, se adjunta el informe completo como archivo de texto. Quitar asignaciones de un usuario no elimina las que hereda de sus roles; quitar las de un rol afecta al acceso que este concede a sus miembros. El propietario mantiene su acceso implícito.
