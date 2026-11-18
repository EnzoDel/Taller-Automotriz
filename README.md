# Taller Automotriz

Aplicación full-stack para la gestión integral de un taller automotriz, inventario de repuestos y procesos operativos del negocio.

## Estructura principal

- `backend/`: API REST con Node.js + Express, validaciones, autenticación JWT, Swagger y acceso a PostgreSQL.
- `frontend/`: aplicación React + Vite con Tailwind CSS para módulos de inventario, clientes, vehículos, órdenes y facturación.
- `.github/`: instrucciones globales y reglas de seguridad/documentación para Copilot.

## Módulos principales

- Inventario y stock con semáforo de repuestos.
- Clientes y vehículos con historial de mantenimientos.
- Órdenes de trabajo y asignación de mecánicos.
- Facturación y cumplimiento SRI para Ecuador.
- Reportería de ventas e ingresos.

## Tecnologías previstas

- Backend: Node.js, Express, PostgreSQL, JWT, Swagger, bcrypt, Helmet
- Frontend: React, Vite, Tailwind CSS, Axios, React Router
- Seguridad: validación con `express-validator` o `Joi`, cookies HttpOnly, CORS restringido, consultas parametrizadas

## Arquitectura backend

Se mantiene la arquitectura en capas obligatoria:

- `routes/` -> definición de endpoints
- `controllers/` -> recepción y respuesta HTTP
- `services/` -> lógica de negocio
- `middlewares/` -> autenticación, validación y manejo de errores
- `config/` -> conexiones y Swagger

## Inicio rápido

1. Crear la base `DB_TallerAutomotriz` en PostgreSQL e importar el esquema con `psql -U postgres -d DB_TallerAutomotriz -f TallerAutomotriz.sql`.
2. Copiar `backend/.env.example` como `backend/.env` y configurar las credenciales locales de PostgreSQL.
3. Instalar dependencias desde `backend/` y `frontend/` con `npm install`.
4. Crear el primer administrador ejecutando `npm run create-admin` desde `backend/`; la contraseña se solicita sin mostrarla.
5. Ejecutar `npm run dev` en cada carpeta, en terminales separadas.
6. Iniciar sesión en el frontend con el correo y contraseña del administrador.

## Preparación de despliegue de demostración

La configuración prevista usa Vercel para React, Render para la API y Supabase para PostgreSQL. **No se han creado ni desplegado servicios en esos proveedores.** Usa únicamente datos ficticios para esta demostración. Antes de utilizar datos reales, revisa seguridad, respaldos, disponibilidad, privacidad y condiciones de cada proveedor. Los planes gratuitos pueden suspender servicios y Vercel Hobby tiene restricciones de uso comercial.

1. **Repositorio:** este proyecto debe estar en un repositorio Git propio. Comprueba qué archivos vas a subir: el repositorio Git detectado en este equipo está en el directorio personal y no debes publicar ese directorio completo. No subas `.env`, certificados de firma, contraseñas ni datos reales.
2. **Supabase:** crea un proyecto de prueba y usa su editor SQL para ejecutar primero `TallerAutomotriz.sql` en una base vacía. Después ejecuta, en orden por nombre, todos los archivos de `backend/migrations/`; el esquema base no incluye todas las migraciones. No ejecutes el esquema inicial sobre una base existente con datos. Copia desde **Connect** la cadena del *Session pooler* (puerto 5432, compatible con IPv4 desde Render) y descarga el certificado raíz de la base desde los ajustes de Supabase.
3. **Vercel:** importa el repositorio, selecciona `frontend` como directorio raíz, framework Vite, `npm run build` como compilación y `dist` como salida. Define `BACKEND_URL` como la URL HTTPS de Render sin barra final; si aún no existe, usa temporalmente `https://example.invalid` y reemplázala después. Deja `VITE_API_URL` vacía. El archivo `frontend/vercel.json` envía `/api` a Render y permite recargar rutas de React. Anota el origen estable HTTPS asignado por Vercel.
4. **Render:** crea el servicio desde `render.yaml` o configura raíz `backend`, `npm ci`, `npm start` y health check `/api/health`. En las variables del servicio configura `NODE_ENV=production`, `DB_SSL=true`, `DATABASE_URL` con la cadena del Session pooler, `DB_SSL_CA` con el contenido PEM del certificado raíz, `FRONTEND_ORIGINS` con el origen HTTPS estable de Vercel sin barra final y `JWT_SECRET` como una cadena aleatoria de al menos 32 bytes. `NODE_VERSION=22` está definido en el Blueprint. No incluyas `sslmode`, `ssl`, `sslrootcert`, `sslcert` ni `sslkey` en `DATABASE_URL`: TLS y la verificación del certificado se configuran mediante `DB_SSL` y `DB_SSL_CA`. Para varios orígenes permitidos, sepáralos con comas.
5. **Conectar:** reemplaza `BACKEND_URL` en Vercel por la URL HTTPS real del servicio Render, sin `/api` ni barra final, y vuelve a desplegar Vercel. Las cookies son HttpOnly, Secure y SameSite=Lax; el proxy mantiene las solicitudes en el mismo origen. Las solicitudes que cambian datos requieren un encabezado `Origin` incluido en `FRONTEND_ORIGINS`. Autoriza explícitamente cualquier dominio de vista previa que necesites usar; no uses comodines.
6. **Administrador inicial:** desde una terminal interactiva y un entorno seguro, apunta `DATABASE_URL`, `DB_SSL=true` y `DB_SSL_CA` a la base de prueba y ejecuta `npm run create-admin` en `backend`. El script solo crea el administrador cuando no hay usuarios. No publiques los valores de conexión ni la contraseña.
7. **Verificación:** comprueba `https://TU-DOMINIO/api/health`, inicia sesión, recarga una ruta interna, consulta vehículos y registra datos ficticios. Verifica cierre de sesión y acceso denegado sin sesión. Render Free puede tardar en despertar; el frontend espera hasta 60 segundos en producción. La respuesta del health check confirma que la API responde, no que la base esté disponible.

Para conexiones TLS de Supabase y detalles del pooler consulta la [documentación de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) y la [guía de Render](https://render.com/articles/how-to-connect-a-render-service-to-supabase-postgres). Las integraciones WhatsApp y SRI permanecen deshabilitadas si no se configuran sus credenciales.

## Usuarios y permisos

Las contraseñas se almacenan con bcrypt y las sesiones usan JWT en una cookie HttpOnly. Los permisos se verifican en el backend en cada solicitud:

- `administrador`: gestión completa de inventario y usuarios.
- `recepcionista`: consultar, registrar, editar y reabastecer inventario; no puede eliminar productos ni gestionar usuarios.
- `mecanico`: consulta de inventario.

El administrador puede crear personal desde la sección Usuarios. La API protege el inventario y la gestión de usuarios según esos permisos; los hashes de contraseña nunca se devuelven.

En desarrollo, si `JWT_SECRET` está vacío se genera una clave temporal al iniciar el servidor y las sesiones terminan al reiniciarlo. En producción `JWT_SECRET` es obligatorio.

## PDFs y WhatsApp

El backend genera PDFs internos para órdenes y facturas. Los comprobantes de factura indican que no sustituyen un documento electrónico autorizado por el SRI.

Para actualizar una base existente con el consentimiento de WhatsApp en clientes, ejecuta una vez:

```powershell
psql -U postgres -d DB_TallerAutomotriz -f backend/migrations/20261022_clients_whatsapp_consent.sql
```

En Meta Business configura una plantilla aprobada de tipo utilidad con encabezado **Documento** y tres variables en el cuerpo, en este orden: nombre del cliente, tipo de documento y número de documento. Después configura solo en `backend/.env` las variables `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_TEMPLATE_NAME` y `WHATSAPP_TEMPLATE_LANGUAGE`.

Rutas de documentos:

- `GET /api/work-orders/:workOrderId/pdf`
- `POST /api/work-orders/:workOrderId/whatsapp`
- `GET /api/billing/invoices/:invoiceNumber/pdf`
- `POST /api/billing/invoices/:invoiceNumber/whatsapp`

El envío por WhatsApp requiere consentimiento guardado en el cliente. Sin consentimiento responde `409`; si la integración Meta no está configurada, responde `503`. Nunca guardes el token de Meta en el frontend ni en archivos versionados.

## Preparación de facturación electrónica SRI

Las facturas existentes siguen siendo internas; esta etapa no genera XML firmado ni las envía al SRI. Para preparar el flujo, aplica una vez la migración `backend/migrations/20261114_sri_electronic_invoices.sql` a la base existente.

Configura en `backend/.env` los campos `SRI_*` de `backend/.env.example`. `SRI_CERTIFICATE_PATH` debe apuntar a un certificado de firma accesible por el proceso del backend; el archivo y la contraseña deben mantenerse fuera del repositorio. Usa inicialmente `SRI_ENVIRONMENT=test` y las URL oficiales del ambiente de pruebas. No cambies a producción hasta completar la homologación y verificar los datos tributarios del emisor.

El endpoint autenticado `GET /api/billing/sri/status` muestra el ambiente, los requisitos faltantes y si el archivo del certificado es accesible. No expone valores secretos; que la configuración esté completa no verifica la validez del certificado, la conectividad ni la autorización del SRI. El registro `sri_comprobantes` conserva el estado y la evidencia electrónica cuando se implemente el flujo de firma y envío.

## Semáforo de stock

El inventario usa un stock máximo objetivo definido por producto. En la tabla, el semáforo aparece rojo hasta el 25% del máximo, amarillo por encima del 25% y hasta el 50%, y verde por encima del 50%. El estado muestra además si el producto está agotado, bajo, medio, saludable o completo. Los productos existentes no reciben un máximo automático: edítalos para definirlo; mientras tanto, se marcan como **Definir máximo**.

Para actualizar una base existente ejecuta una vez:

```powershell
psql -U postgres -d DB_TallerAutomotriz -f backend/migrations/20261116_inventory_stock_max.sql
```

## Recordatorios de mantenimiento

Al cerrar una orden de trabajo se debe indicar la fecha del próximo mantenimiento, que no puede ser anterior a hoy. La fecha se guarda en el vehículo junto con el cierre de la orden y su historial; cerrar una orden posterior reemplaza la fecha anterior. Los vehículos existentes quedan sin fecha hasta que se cierre una orden.

La fecha del último mantenimiento queda sin definir al registrar un vehículo y no se puede modificar al editarlo. Actualmente se actualiza automáticamente al cerrar una orden o registrar una factura, si la fecha es más reciente.

Los usuarios con permiso `vehicles:read` ven un aviso interno y pueden consultar la página **Alertas** para los mantenimientos programados para hoy o vencidos. Se consultan al abrir el sistema y se actualizan cada minuto; la comparación usa la hora de Ecuador continental (`America/Guayaquil`). No se envían mensajes a los clientes. La tabla de vehículos muestra también los mantenimientos programados futuros.

Para actualizar una base existente ejecuta:

```powershell
psql -U postgres -d DB_TallerAutomotriz -f backend/migrations/20261116_vehicle_next_maintenance.sql
```

## Reportería

Solo el rol `administrador` (permiso `reports:read`) accede al dashboard **Reportes** y a estos endpoints (parámetros `year` o `fromYear`/`toYear`):

- `GET /api/reports/billing/monthly` y `GET /api/reports/billing/annual`
- `GET /api/reports/purchases/monthly` y `GET /api/reports/purchases/annual`

Los gastos en repuestos se leen de la tabla `compras_repuestos`, que se alimenta al crear un producto con stock y al reabastecer (al precio de compra vigente). Para bases existentes ejecuta una vez:

```powershell
psql -U postgres -d DB_TallerAutomotriz -f backend/migrations/20261029_spare_parts_purchases.sql
```

Las compras anteriores a la migración no se pueden reconstruir y no aparecen en los reportes.

## Requisitos

- Node.js 18+
- PostgreSQL
- npm
