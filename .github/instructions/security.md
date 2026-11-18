# Reglas de seguridad

# Políticas y Estándares de Seguridad - Taller Automotriz

## 1. Autenticación y Cifrado
* **Hashing de Contraseñas:** Uso obligatorio de **`bcrypt`** con un factor de trabajo (*salt rounds*) de 10 como mínimo antes de almacenar las credenciales en PostgreSQL. Queda estrictamente prohibido guardar contraseñas en texto plano.
* **Tokens de Sesión:** Autenticación basada en **JWT (JSON Web Tokens)** con tiempos de expiración definidos.
* **Comparación Segura:** Utilizar `bcrypt.compare()` en el proceso de login. Jamás exponer hashes de contraseñas en las respuestas de la API.

## 2. Configuración de Cabeceras HTTP (Security Headers)
* **Uso de Helmet:** Integrar y configurar el middleware `helmet` en Express para inyectar automáticamente cabeceras de seguridad:
  * `X-Frame-Options: DENY` (previene clickjacking).
  * `X-Content-Type-Options: nosniff` (previene suplantación de tipos MIME).
  * Política de contenido (*Content Security Policy - CSP*).

## 3. Prevención de Inyecciones (SQL Injection)
* **Consultas Parametrizadas:** Prohibido concatenar variables directamente en las consultas SQL. Usar obligatoriamente consultas parametrizadas (`$1, $2`) con el cliente de PostgreSQL (`pg`) para prevenir SQL Injection.

## 4. Validación y Saneamiento de Entradas (XSS & Validación)
* **Validación en Backend:** Ningún dato recibido del cliente es confiable. Usar librerías como `express-validator` o `Joi` para validar tipos y longitudes en todas las rutas de la API.
* **Mitigación de XSS:** Sanitizar campos de texto y evitar el uso inseguro de `dangerouslySetInnerHTML` en el frontend.

## 5. Control de Accesos (CORS)
* **Restricción de Orígenes:** Configurar el middleware `cors` para permitir únicamente peticiones provenientes del dominio oficial del frontend (ej. `http://localhost:5173` en desarrollo).

## 6. Gestión de Sesiones y Protección de Cookies
* **Almacenamiento en Cookies Seguras:** Los tokens de autenticación no deben almacenarse en `localStorage`. Deben enviarse mediante **cookies HTTP-only**.
* **Atributos Obligatorios para Cookies:**
  * `HttpOnly: true`: Impide el acceso a la cookie mediante JavaScript del cliente (mitiga XSS).
  * `Secure: true`: Solo se transmite mediante conexiones HTTPS (en producción).
  * `SameSite=Strict` o `SameSite=Lax`: Mitiga ataques CSRF.