# Contrato HTTP de los clientes del bot

El proyecto consume APIs externas y no publica un servidor HTTP propio. Las respuestas se validan con Zod antes de crear menús o embeds. Los fixtures y las pruebas locales comprueban al cliente; la aceptación con cuentas reales requiere un servidor y tiendas de prueba.

## Transporte

`request<T>` usa fetch de Node, admite cancelación y aplica un tiempo límite de 15 segundos. Rechaza redirecciones para no reenviar credenciales a otro destino. Los estados fuera de 200–299 generan `APIError` con el estado HTTP y el cuerpo saneado en `responseBody`, como JSON o texto. Los cuerpos de error que superan 16 KiB se omiten; los fallos de lectura conservan el estado HTTP. Un 204 devuelve undefined. Las demás respuestas deben contener JSON válido y cumplir el límite de tamaño y el esquema de su operación.

No se reintentan automáticamente las escrituras. Una tarjeta puede haberse creado aunque se pierda su respuesta: comprobarla antes de repetir la operación.

La búsqueda de un pago de Tebex por ID trata HTTP 404 como pago no encontrado y lo registra a nivel informativo. Discord muestra «Pago no encontrado». El resto de estados HTTP erróneos conserva el tratamiento de excepción, incluido un 404 al eliminar una tarjeta.

Los logs incluyen proveedor, recurso, método, estado y duración. Las peticiones fallidas añaden URL, parámetros, cabeceras configuradas y enviadas, payload saneado, versiones de Node/Undici y datos de conexión disponibles (dirección remota, IPv4/IPv6, TLS y ALPN). Los canales de diagnóstico de Undici capturan las cabeceras por petición, incluso cuando hay peticiones simultáneas. Los payloads multipart conservan los campos repetidos; archivos y streams no se vuelcan. Se ocultan las credenciales registradas y los campos sensibles. Las respuestas fallidas incluyen cabeceras de diagnóstico como `cf-ray`, `cf-mitigated`, `server`, tipo de contenido y `retry-after`; no se registran cookies de respuesta. Los errores de validación identifican los campos afectados y omiten los valores recibidos.

## Integraciones

Para depurar la autenticación, tras registrar una petición fallida con la cabecera `X-Tebex-Secret`, se escribe un bloque adicional `Tebex request authentication (debug)` con su valor completo. Esta excepción a la ocultación se aplica tanto a la terminal como a `latest.log`, accesible mediante `/logs`. El diagnóstico principal conserva su saneado habitual e incluye el payload en `request.payload`.

| Proveedor | Base                    | Autenticación  | Operaciones                       |
| --------- | ----------------------- | -------------- | --------------------------------- |
| Tebex     | https://plugin.tebex.io | X-Tebex-Secret | Pagos, usuarios, tarjetas y vetos |

Las cabeceras de Tebex y las formas de pagos y tarjetas se contrastaron con su documentación de [autenticación](https://docs.tebex.io/plugin/authentication), [pagos](https://docs.tebex.io/plugin/endpoints/payments) y [tarjetas](https://docs.tebex.io/plugin/endpoints/gift-cards). Los importes de pago pueden llegar como texto y se normalizan a números; los identificadores de tarjetas y paquetes se normalizan a texto.

Los identificadores de ruta y nombres de usuario se codifican. Las escrituras mantienen FormData; fetch genera su Content-Type y boundary. El cliente envía `User-Agent: support-bot/1.2.0 (+https://github.com/Ivanlpc/support-bot)` y `Accept: application/json`. Los errores de negocio recibidos con HTTP 2xx se reconocen por su esquema; los errores HTTP se propagan como excepciones.

## Navegación y permisos

Tebex devuelve solo tarjetas activas con una nota que comienza por LINKED seguida del ID de Discord correspondiente. La selección vuelve a consultar el proveedor y comprueba la vinculación antes de revelar el código.

Las sesiones de menús caducan a los 15 minutos y comprueban usuario y servidor. Las páginas de pagos vuelven a comprobar permisos. Los menús y botones respetan los límites de 25 opciones y 100 caracteres por opción de Discord.

## Comprobaciones

Ejecuta `npm test`. Las pruebas HTTP levantan un servidor local en un puerto aleatorio y utilizan los clientes reales con datos controlados, sin contactar con los proveedores. Se comprueban autenticación, codificación, paginación, filtrado, contratos, HTTP erróneo, JSON inválido, respuestas vacías, redirecciones y tiempos límite. La prueba de paginación comprueba propiedad y acceso a elementos más allá de las primeras 25 opciones.

Postman no pudo iniciar por una política local de Private Cloud que impide leer su manifiesto. No se atribuyen estos resultados a Postman. La aceptación de planes, permisos de tienda, estados de pago y límites reales del proveedor queda para las cuentas de prueba.
