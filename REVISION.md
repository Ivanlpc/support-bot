# Revisión técnica de Support Bot

Actualización del 4 de noviembre de 2026. Las mejoras implementables de la revisión se han incorporado al código y a las herramientas de operación. El despliegue real depende de que conectes el runner y prepares las credenciales del VPS.

## Correcciones incorporadas

| Área                         | Resultado                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencias y arranque      | Node 24 fijado, Discord.js y mysql2 actualizados, instalación con lockfile, registro de comandos antes del login y cierre controlado         |
| Configuración y traducciones | Configuración validada y tipada con Zod, mezcla profunda de opciones, compatibilidad con Database.shopy y catálogo de mensajes tipado        |
| Datos externos               | Validación de pagos, usuarios, tarjetas y vetos; importes normalizados y errores sin volcar cuerpos recibidos                                |
| Discord                      | Respuestas privadas y diferidas, modales únicos, permisos revalidados y errores con referencia de interacción                                |
| Permisos                     | Identificadores internos estables; creación y eliminación de tarjetas separadas con migración de permisos anteriores                         |
| Navegación                   | Páginas de 25 opciones, sesiones por usuario y servidor con caducidad y consulta de CraftingStore desde la página seleccionada               |
| Embeds                       | Límites de títulos, campos y texto total; manejo de valores vacíos y códigos de tarjetas fuera de los valores del menú                       |
| Cifrado                      | GCM para nuevas escrituras, lectura OFB y herramienta transaccional de recifrado con simulación y clave anterior                             |
| Logs                         | JSON en consola con nivel, stack, causa, duración, IDs de interacción y ocultación de secretos; logs de MySQL, APIs, Discord y ciclo de vida |
| Salud                        | Comprobación de Discord, registro de comandos y MySQL; heartbeat para Docker y salida con error ante fallos persistentes                     |
| Docker                       | Varias etapas, usuario no root, dependencias de producción, filesystem de solo lectura, límites y rotación de logs                           |
| CI/CD                        | Validación en GitHub, despliegue en runner propio desde main, compilación por commit, systemd start/stop y rollback por salud                |
| Backups                      | Volcado privado y timer systemd opcional; un dump fallido no se publica como copia válida                                                    |
| Mantenimiento                | Prettier, Oxlint, registro de comandos explícito y eliminación de utilidades sin uso                                                         |

## Comprobaciones reproducibles

- `npm run check`: formato, linter, tipos, 44 pruebas y compilación.
- `npm run test:database`: MySQL 8.4 temporal, esquema nuevo y antiguo, migración repetida, preservación de permisos y revocación independiente de eliminación de tarjetas.
- La prueba SQL comprueba también simulación sin cambios, recifrado con clave nueva y rechazo de ejecución sin la indicación de backup.
- Docker: targets de pruebas y producción, ejecución como UID 1000 en modo de solo lectura y rechazo claro de configuración sin token.
- Compose: validación con MySQL externo y con MySQL en Docker.
- Despliegue: activación, rollback por salud y preservación de la versión activa si falla la compilación, con systemd y Docker simulados en un contenedor desechable.
- `npm audit`: cero vulnerabilidades conocidas en la consulta realizada.

## Aceptación pendiente en tu entorno

1. Instalar el runner con etiqueta `support-bot`, preparar archivos privados e instalar las unidades como explica [DEPLOY.md](docs/DEPLOY.md). La política de sudo y systemd deben comprobarse en el VPS.
2. Probar los comandos reales con Discord y tiendas de prueba. Las pruebas locales no autentican cuentas reales ni crean tarjetas. La eliminación en CraftingStore permanece deshabilitada: estaba marcada como incompatible y su documentación no pudo leerse por el control de acceso del sitio.
3. Respaldar la base existente, aplicar ambas migraciones y ejecutar el recifrado con la clave original. No se ha operado sobre datos reales. Si el volcado antiguo correspondía a una tienda real, sustituir esa credencial y revisar su exposición histórica.
4. Elegir destino fuera del VPS, retención y pruebas de restauración de backups. El timer queda deshabilitado hasta configurar su cuenta.

El rollback restaura imagen y Compose; no revierte esquema, claves ni datos. La guía separa la preparación inicial y las operaciones de datos de los despliegues habituales.
