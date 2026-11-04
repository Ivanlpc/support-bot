# Contrato HTTP de los clientes del bot

El proyecto consume APIs externas y no publica un servidor HTTP propio. Las respuestas se validan con Zod antes de crear menús o embeds. Los fixtures y las pruebas locales comprueban al cliente; la aceptación con cuentas reales requiere un servidor y tiendas de prueba.

## Transporte

`request<T>` usa fetch de Node, admite cancelación y aplica un tiempo límite de 15 segundos. Rechaza redirecciones para no reenviar credenciales a otro destino. Los estados fuera de 200–299 generan `APIError` con el estado HTTP, sin incluir el cuerpo recibido. Un 204 devuelve undefined. Las demás respuestas deben contener JSON válido y cumplir el límite de tamaño y el esquema de su operación.

No se reintentan automáticamente las escrituras. Una tarjeta puede haberse creado aunque se pierda su respuesta: comprobarla antes de repetir la operación.

Los logs incluyen proveedor, recurso, método, estado y duración. No incluyen las cabeceras, el cuerpo ni el nombre de usuario de la URL. Los errores de validación identifican los campos afectados y omiten los valores recibidos.

## Integraciones

| Proveedor     | Base                             | Autenticación  | Operaciones                            |
| ------------- | -------------------------------- | -------------- | -------------------------------------- |
| Tebex         | https://plugin.tebex.io          | X-Tebex-Secret | Pagos, usuarios, tarjetas y vetos      |
| CraftingStore | https://api.craftingstore.net/v7 | token          | Pagos paginados y creación de tarjetas |

Las cabeceras de Tebex y las formas de pagos y tarjetas se contrastaron con su documentación de [autenticación](https://docs.tebex.io/plugin/authentication), [pagos](https://docs.tebex.io/plugin/endpoints/payments) y [tarjetas](https://docs.tebex.io/plugin/endpoints/gift-cards). Los importes de pago pueden llegar como texto y se normalizan a números; los identificadores de tarjetas y paquetes se normalizan a texto.

Los contratos de CraftingStore parten del cliente heredado: su [documentación oficial](https://docs.api.craftingstore.net/) presenta un control de acceso que impidió leerla en esta sesión. Sus respuestas siguen necesitando aceptación contra una tienda real. La eliminación de tarjetas continúa deshabilitada.

Los identificadores de ruta y nombres de usuario se codifican. Las escrituras mantienen FormData. Los errores de negocio recibidos con HTTP 2xx se reconocen por su esquema; los errores HTTP se propagan como excepciones.

## Navegación y permisos

CraftingStore permite pedir una página concreta para los menús. Seleccionar un pago consulta la página desde la que se mostró. La búsqueda directa recorre como máximo 100 páginas, devuelve null al llegar al final y comunica un error específico al alcanzar el límite.

Tebex devuelve solo tarjetas activas con una nota que comienza por LINKED seguida del ID de Discord correspondiente. La selección vuelve a consultar el proveedor y comprueba la vinculación antes de revelar el código.

Las sesiones de menús caducan a los 15 minutos y comprueban usuario y servidor. Las páginas de pagos vuelven a comprobar permisos. Los menús y botones respetan los límites de 25 opciones y 100 caracteres por opción de Discord.

## Comprobaciones

Ejecuta `npm test`. Las pruebas HTTP levantan un servidor local en un puerto aleatorio y utilizan los clientes reales con datos controlados, sin contactar con los proveedores. Se comprueban autenticación, codificación, paginación, filtrado, contratos, HTTP erróneo, JSON inválido, respuestas vacías, redirecciones y tiempos límite. La prueba de paginación comprueba propiedad y acceso a elementos más allá de las primeras 25 opciones.

Postman no pudo iniciar por una política local de Private Cloud que impide leer su manifiesto. No se atribuyen estos resultados a Postman. La aceptación de planes, permisos de tienda, estados de pago y límites reales del proveedor queda para las cuentas de prueba.
