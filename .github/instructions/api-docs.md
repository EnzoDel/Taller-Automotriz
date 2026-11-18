# Estándar de documentación de API

# Estándares de Documentación de la API - Taller Automotriz

## 1. Herramienta Oficial de Documentación
* **Swagger / OpenAPI:** Toda la API REST desarrollada en Node.js y Express debe estar documentada utilizando el estándar OpenAPI (versión 3.0 o superior).
* **Librerías oficiales:** 
  * `swagger-ui-express` para renderizar la interfaz gráfica interactiva en la ruta `/api-docs`.
  * `swagger-jsdoc` para generar la especificación a partir de comentarios JSDoc directamente en los archivos de rutas o controladores.

## 2. Requisitos para cada Endpoint Documentado
Cada ruta de la API debe incluir su respectiva documentación en el código mediante bloques JSDoc que contengan:
* **Resumen y Descripción:** Qué hace el endpoint y el rol requerido (ej. Administrador, Mecánico, Recepcionista).
* **Parámetros:** Definición clara de parámetros en la URL (`path params`), query (`query params`) o cuerpo (`request body`), especificando tipos de datos y obligatoriedad.
* **Esquemas de Respuesta:** Documentar los códigos de estado HTTP estándar:
  * `200 / 201`: Éxito (con la estructura JSON de respuesta).
  * `400`: Error de validación de campos.
  * `401`: No autorizado (falta de token o cookie válida).
  * `403`: Prohibido (permisos insuficientes).
  * `404`: Recurso no encontrado.
  * `500`: Error interno del servidor.
* **Seguridad:** Indicar claramente si el endpoint requiere autenticación mediante el esquema Bearer (JWT) o cookies HttpOnly.