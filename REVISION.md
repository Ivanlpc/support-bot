# Estado técnico de Support Bot

El proyecto está preparado para una instalación nueva. La base de datos se crea importando discordbot.sql una vez sobre una base vacía. El despliegue utiliza GitHub Secrets y un único job que hace checkout, build de imagen y docker run en el runner self-hosted.

## Funcionalidad

- Configuración validada con Zod y un único formato de conexión Database.
- Tebex como único proveedor; setup sin selector y búsqueda por ID de transacción.
- Español como único idioma, sin comando de cambio ni columna de idioma en MySQL.
- Setup disponible para el propietario y administradores, con comprobación de permisos al guardar.
- Tokens de tienda protegidos con AES-128-GCM y una única ENCRYPTION_KEY.
- Permisos independientes para consultar pagos, gestionar permisos, crear y eliminar tarjetas y vetar usuarios.
- Comandos perm add, remove, clear, list y search con aislamiento por servidor.
- Menús paginados por usuario y servidor, respuestas privadas y límites de embeds.
- Logs JSON en consola y en archivos rotados, con ocultación de credenciales.
- Imagen Docker con usuario no root y filesystem de solo lectura; código, .env externo y logs agrupados bajo /opt/support-bot en el VPS.
- Workflow limitado a construir y ejecutar el contenedor; MySQL debe estar disponible de forma independiente.

## Comprobaciones

- npm run check: formato, linter, tipos, pruebas y compilación.
- npm run test:database: esquema inicial, siete permisos, valores predeterminados, Unicode, cifrado de tokens, borrado en cascada y operaciones de permisos sobre MySQL local desechable.
- scripts/check-run.sh: generación privada del .env externo, validación de secretos, sustitución del contenedor y conservación de datos y logs con Docker simulado.
- Docker: exclusión de los .env del build, carga de variables durante docker run y escritura de logs en el montaje persistente.

## Preparación del entorno

1. Crear una base vacía, importar discordbot.sql y configurar la cuenta del bot.
2. Preparar el runner con etiqueta support-bot y permisos sobre /opt/support-bot.
3. Configurar GitHub Secrets como indica [DEPLOY.md](docs/DEPLOY.md).
4. Probar los comandos con cuentas reales de Discord y tiendas de prueba. Las pruebas locales no autentican cuentas reales ni crean tarjetas en proveedores.

El backup opcional puede ejecutarse con deploy/backup.sh; su retención y destino externo deben configurarse según las necesidades de la instalación.
