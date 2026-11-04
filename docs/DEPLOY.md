# Despliegue en un VPS con runner propio y systemd

El workflow `Build and deploy` comprueba formato, linter, tipos, pruebas, migraciones y Docker en un runner de GitHub. Después de un push a `main`, el trabajo de despliegue se ejecuta en tu runner Linux con la etiqueta `support-bot`. También puedes lanzarlo desde Actions con `workflow_dispatch` sobre `main`.

El runner construye una imagen etiquetada con el SHA del commit y cambia la versión activa mediante un enlace simbólico. **systemd arranca y detiene Docker Compose**. Si el contenedor nuevo no alcanza el estado saludable en tres minutos, el script intenta restaurar la versión anterior. El primer despliegue fallido queda detenido porque todavía no hay una versión anterior.

## Preparación del VPS

La instalación está preparada para un VPS Linux con systemd, Bash, Docker Engine, el plugin `docker compose`, Git y `sudo`. El runner debe estar instalado como servicio y tener la etiqueta `support-bot`. No necesita Node instalado en el VPS: la compilación y la ejecución utilizan Docker.

En el repositorio, protege `main` y configura el entorno de GitHub `production` para permitir despliegues únicamente desde esa rama. Reserva el runner con acceso a Docker para este repositorio y código de confianza. Las comprobaciones de las pull requests utilizan runners alojados en GitHub.

Desde la raíz del repositorio en el VPS, sustituye `github-runner` por el usuario real del runner:

```bash
sudo bash deploy/install-systemd.sh github-runner
sudoedit /etc/support-bot/runtime.env
```

El instalador crea `/opt/support-bot/releases`, instala las unidades, habilita `support-bot.service` para el próximo arranque y concede al runner acceso a Docker y a las operaciones necesarias de `systemctl`. No arranca el bot antes de disponer de una versión y credenciales. Reinicia la sesión o el servicio del runner para aplicar su pertenencia al grupo `docker`.

No hace falta almacenar credenciales del bot en GitHub. Los archivos privados del VPS permanecen en `/etc/support-bot`, fuera del checkout y de la imagen.

## Base de datos existente

Completa `/etc/support-bot/runtime.env`, que conserva permisos `0600`:

```dotenv
DISCORD_TOKEN=TOKEN_REAL_DEL_BOT
ENCRYPTION_KEY=CLAVE_ORIGINAL_DE_16_BYTES
DB_HOST=host.docker.internal
DB_PORT=3306
DB_USER=bot
DB_PASSWORD=CLAVE_DE_MYSQL
DB_NAME=shopy
LOG_LEVEL=info
```

`host.docker.internal` apunta al host del contenedor. Usa el nombre o la IP correspondiente si MySQL está en otro equipo. `localhost` dentro del contenedor se refiere al propio contenedor. MySQL debe aceptar la conexión desde la red de Docker.

Para una base nueva, importa `discordbot.sql`. Para una instalación antigua, detén el bot, guarda una copia y aplica **ambas migraciones** antes del primer arranque de esta versión. La segunda separa `giftcard.create` y `giftcard.delete`, conservando el acceso anterior durante la conversión. Las migraciones no se ejecutan automáticamente en cada despliegue.

Puedes ejecutar las migraciones con un usuario de mantenimiento que tenga permisos DDL. Desde el repositorio en el VPS:

```bash
docker build --tag support-bot:maintenance .
sudo docker run --rm \
  --add-host host.docker.internal:host-gateway \
  --env-file /etc/support-bot/maintenance.env \
  support-bot:maintenance node dist/tools/migrate.js --backup-confirmed
```

`maintenance.env` contiene las variables `DB_*` del usuario de mantenimiento. El comando anterior utiliza la red bridge de Docker y sirve para MySQL accesible por IP o por el host. Si MySQL ya está en el Compose de este proyecto con el nombre `db`, añade `--network support-bot_default`. La cuenta del bot puede conservar sus permisos de ejecución habituales después de migrar.

El DDL de MySQL realiza commits implícitos. Repetir las migraciones es seguro para los casos comprobados, pero el cambio de esquema no equivale a un rollback de datos. No reviertas a una versión anterior a la migración de permisos sin restaurar su esquema y sus datos compatibles.

## MySQL también en Docker

Esta opción es para una instalación nueva o una base que vayas a importar expresamente. Crea `/etc/support-bot/mysql.env` con permisos `0600`:

```dotenv
MYSQL_ROOT_PASSWORD=CLAVE_ROOT_NUEVA
MYSQL_DATABASE=shopy
MYSQL_USER=bot
MYSQL_PASSWORD=MISMA_CLAVE_QUE_DB_PASSWORD
```

En `runtime.env`, utiliza `DB_HOST=db`. Crea `/etc/support-bot/systemd.env` con esta línea:

```dotenv
COMPOSE_FILE=/opt/support-bot/current/compose.yml:/opt/support-bot/current/compose.mysql.yml
```

El primer arranque de un volumen vacío importa el esquema limpio. MySQL espera a estar saludable antes de iniciar el bot. Los datos se guardan en el volumen `support-bot_mysql-data`; detener systemd o cambiar de versión conserva ese volumen. El puerto de MySQL no se publica al exterior.

## Operación normal

Cuando el runner y los archivos privados estén preparados, sube los cambios a `main` o lanza `Build and deploy` desde Actions. El script impide dos despliegues simultáneos y no detiene el servicio hasta que la imagen se ha construido correctamente.

```bash
sudo systemctl start support-bot.service
sudo systemctl stop support-bot.service
sudo systemctl restart support-bot.service
sudo systemctl status support-bot.service
sudo journalctl -u support-bot.service -f -o cat
```

Los logs son líneas JSON con fecha UTC, nivel, operación, duración y contexto de interacción. Los errores incluyen stack y causa; los mensajes al usuario incorporan una referencia para buscar la interacción. Para más detalle, cambia `LOG_LEVEL=debug` en `runtime.env` y reinicia el servicio. Las cabeceras, cuerpos de peticiones y parámetros SQL no se registran. Las credenciales conocidas y los campos sensibles se ocultan.

Docker limita los registros a cinco archivos de 10 MB por bot. El journal sigue la política de retención de journald del VPS. El monitor de salud comprueba Discord, el registro de comandos y MySQL; ante fallos persistentes, el bot termina con error y systemd lo reinicia. Tras cinco arranques fallidos en cinco minutos, revisa los logs y ejecuta `sudo systemctl reset-failed support-bot.service` antes de volver a arrancar.

Para una reversión manual, detén el servicio, apunta `/opt/support-bot/current` a una carpeta anterior dentro de `/opt/support-bot/releases` y vuelve a arrancar. El rollback automático cambia la imagen y Compose, no las credenciales de `/etc/support-bot` ni el contenido de MySQL. Conserva las versiones necesarias y elimina imágenes antiguas solo después de decidir el periodo de recuperación.

## Copias de seguridad

El instalador añade un servicio y un timer de backup, pero el timer permanece deshabilitado hasta configurar su cuenta. Crea `/etc/support-bot/backup.env` con permisos `0600`:

```dotenv
MYSQL_HOST=db
MYSQL_TCP_PORT=3306
MYSQL_USER=usuario_backup
MYSQL_PWD=CLAVE_BACKUP
MYSQL_DATABASE=shopy
```

Para MySQL externo, usa su host real o `host.docker.internal`. La cuenta necesita los permisos de lectura, vistas y triggers que requiera el volcado de esa base. El servicio usa la red `support-bot_default`, que existe mientras el proyecto Compose está arrancado.

```bash
sudo systemctl start support-bot-backup.service
sudo journalctl -u support-bot-backup.service --no-pager
sudo systemctl enable --now support-bot-backup.timer
```

El timer ejecuta una copia diaria a las 03:00 UTC con una pequeña demora aleatoria. Los archivos comprimidos se guardan con permisos privados en `/var/backups/support-bot`. Un fallo de `mysqldump` no publica un archivo como copia válida. Programa además su transferencia fuera del VPS, una política de retención y pruebas de restauración según tus necesidades; el script no borra copias anteriores.

## Recifrado y cambio de clave

Para convertir filas OFB antiguas a GCM mantén `ENCRYPTION_KEY` con el valor original y deja vacía `PREVIOUS_ENCRYPTION_KEY`. Si cambias la clave, coloca la nueva en `ENCRYPTION_KEY` y la original en `PREVIOUS_ENCRYPTION_KEY`. Detén el bot y guarda una copia antes de proceder.

Con la imagen de mantenimiento y la red que permita llegar a MySQL, ejecuta primero la simulación:

```bash
sudo docker run --rm --env-file /etc/support-bot/runtime.env \
  --add-host host.docker.internal:host-gateway \
  support-bot:maintenance node dist/tools/reencrypt.js
```

Para aplicar, repite el comando añadiendo `--apply --backup-confirmed`. La herramienta bloquea las filas, descifra y actualiza todos los tokens dentro de una transacción. Si falla una fila, revierte todo. Después de comprobar el resultado y conservar la copia segura, retira `PREVIOUS_ENCRYPTION_KEY` y arranca el servicio. Durante la conversión de filas OFB, la clave anterior se usa expresamente porque ese formato antiguo no permite detectar una clave incorrecta mediante autenticación.

## Verificación del despliegue

Las pruebas del script se ejecutan en un contenedor desechable con Docker y systemd simulados:

```bash
docker run --rm --env DEPLOY_TEST_CONTAINER=yes \
  --volume "$PWD:/workspace:ro" --workdir /workspace \
  node:24.22.2-bookworm-slim bash scripts/check-deploy.sh
```

Estas pruebas comprueban activación, rollback por salud y preservación de la versión activa si falla la compilación. El arranque real de systemd, los permisos de tu runner y la aceptación de los comandos en Discord se verifican en el VPS cuando lo conectes; todavía no se ha realizado un despliegue en ese servidor.
