# Despliegue con GitHub Secrets y docker run

El workflow tiene un único job en tu runner self-hosted: checkout, build de la imagen y docker run. Se ejecuta al publicar en main o mediante workflow_dispatch. No ejecuta pruebas ni gestiona systemd.

## Una carpeta en el VPS

```text
/opt/support-bot/
  .env                  # Generado desde GitHub Secrets al desplegar
  current -> source/<commit>/
  source/<commit>/      # Código fuente de la versión desplegada
  logs/app.log          # Logs persistentes y archivos rotados
  data/                 # Datos opcionales que ya mantengas aquí
  backups/              # Copias opcionales
```

La imagen contiene código y compilado bajo `/app`. **El `.env` no se incluye en la imagen**: el script lo genera con permisos 0600 y lo carga mediante `docker run --env-file /opt/support-bot/.env`. Cada despliegue actualiza este archivo desde los secretos configurados en GitHub. Los logs se montan en `/app/logs`, rotan a los 10 MB y conservan cuatro archivos anteriores. Los datos y logs permanecen al sustituir el contenedor.

## Preparar el runner una vez

Necesitas un runner Linux con las etiquetas `self-hosted`, `linux` y `support-bot`, ejecutado con un usuario no root. Ese usuario necesita acceso a Docker y a la carpeta de instalación. El VPS debe disponer de Docker Engine, Bash, Git, tar y flock.

Sustituye `github-runner` por el usuario y grupo reales:

```bash
sudo install -d -o github-runner -g github-runner -m 0750 \
  /opt/support-bot /opt/support-bot/logs /opt/support-bot/source
```

Si ya existían logs o fuentes con otro propietario, ajusta únicamente esas carpetas:

```bash
sudo chown -R github-runner:github-runner /opt/support-bot/logs /opt/support-bot/source
```

El contenedor usa el UID y GID del runner para escribir en su carpeta de logs. El filesystem de la imagen es de solo lectura; los logs y el directorio temporal tienen sus propios montajes.

Reserva el runner para código de confianza, protege main y configura el entorno GitHub `production` para permitir despliegues de esa rama. No hace falta SSH ni credenciales para un registro de imágenes: se construye y ejecuta directamente en el VPS.

## Secretos de GitHub

En Settings → Secrets and variables → Actions, o en el entorno production, configura:

| Secret         | Uso                                                                       |
| -------------- | ------------------------------------------------------------------------- |
| DISCORD_TOKEN  | Token del bot, obligatorio                                                |
| ENCRYPTION_KEY | Clave de cifrado de 16 bytes UTF-8, obligatoria; guárdala de forma segura |
| DB_HOST        | Host MySQL, obligatorio                                                   |
| DB_USER        | Usuario MySQL, obligatorio                                                |
| DB_NAME        | Nombre de base, obligatorio                                               |
| DB_PASSWORD    | Contraseña MySQL; puede quedar vacía si la cuenta no la necesita          |
| DB_PORT        | Opcional; por defecto 3306                                                |

Los valores deben ocupar una sola línea, como requiere el archivo de docker run. El script rechaza saltos de línea antes de sustituir el `.env` o detener el contenedor anterior y nunca imprime los valores.

Puedes configurar estas variables de GitHub:

| Variable       | Valor por defecto                                         |
| -------------- | --------------------------------------------------------- |
| LOG_LEVEL      | info; también admite debug, warn y error                  |
| DOCKER_NETWORK | bridge; usa la red de tu MySQL si vive en otro contenedor |

MySQL debe estar funcionando de forma independiente: este workflow construye y ejecuta únicamente el bot. Para MySQL instalado en el host puedes usar DB_HOST=host.docker.internal. Si usas un contenedor llamado db en la red support-bot_default, configura DB_HOST=db y DOCKER_NETWORK=support-bot_default.

## Qué hace el despliegue

1. Construye `support-bot:<commit>` con el Dockerfile.
2. Guarda la fuente de ese commit bajo `/opt/support-bot/source` y genera el `.env` externo.
3. Detiene y elimina el contenedor llamado support-bot si existe.
4. Ejecuta la nueva imagen con ese nombre, el archivo de entorno y el montaje de logs. Docker utiliza la política unless-stopped para reiniciarlo.

Una compilación fallida no detiene el contenedor anterior. El paso de ejecución confirma que Docker ha aceptado arrancar el contenedor; no espera a que Discord o MySQL estén saludables ni realiza rollback automático. La imagen mantiene su healthcheck para consultar el estado.

## Consultar y controlar el bot

```bash
docker ps -a --filter name=support-bot
docker logs -f --tail 100 support-bot
tail -f /opt/support-bot/logs/app.log
docker stop support-bot
docker start support-bot
```

Para ejecutar manualmente una imagen ya construida con el mismo `.env`:

```bash
docker run --detach --name support-bot --init --restart unless-stopped \
  --user "$(id -u):$(id -g)" --read-only --tmpfs /tmp \
  --env-file /opt/support-bot/.env --env LOG_DIR=/app/logs \
  --mount type=bind,source=/opt/support-bot/logs,target=/app/logs \
  --add-host host.docker.internal:host-gateway \
  support-bot:TU_COMMIT
```

Detén y elimina el contenedor anterior antes de repetir ese comando. Añade la red de MySQL con `--network` cuando corresponda.

## Base de datos de una instalación nueva

Crea una base de datos vacía en tu MySQL e importa una vez el archivo discordbot.sql. Después configura los secretos DB_HOST, DB_USER, DB_PASSWORD y DB_NAME y lanza el workflow.

El esquema inicial incluye todas las columnas y los permisos actuales. El workflow construye y ejecuta únicamente el bot; MySQL debe estar disponible antes de arrancarlo.
