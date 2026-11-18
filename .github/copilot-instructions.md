# Instrucciones generales para Copilot
# Instrucciones Generales - Sistema de Gestión de Taller Automotriz y Almacén

## 1. Visión General del Proyecto
Sistema web full-stack para la gestión integral de un taller automotriz y su inventario de repuestos. 
* **Stack Tecnológico:** 
  * Backend: Node.js con Express.js
  * Base de Datos: PostgreSQL
  * Frontend: React (con Vite) y Tailwind CSS
* **Arquitectura Backend:** Patrón en capas obligatorias (`Routes` -> `Controllers` -> `Services`).

## 2. Módulos Principales del Sistema
1. **Inventario (Stock):** Semáforo de colores (Verde, Amarillo, Rojo) y descuento automático de repuestos.
2. **Clientes y Vehículos:** CRUDs completos y historial de mantenimientos.
3. **Órdenes de Trabajo:** Núcleo operativo (diagnóstico, mecánico asignado, repuestos utilizados y estados).
4. **Facturación y SRI:** Cobro de trabajos y cumplimiento de facturación electrónica para Ecuador.
5. **Reportería:** Ventas, ingresos y rendimiento del taller.

## 3. Normas y Convenciones de Código
* **Idioma:** Nombres de variables, funciones, tablas y campos en inglés técnico estándar. Comentarios en el código, mensajes de error y respuestas orientadas al usuario en **español**.
* **Manejo de Errores:** Middleware centralizado de errores en el backend con respuestas JSON estandarizadas.

## 4. Referencia a Instrucciones Especializadas
Copilot debe cumplir estrictamente con las normativas descritas en los siguientes sub-archivos de la carpeta `.github/instructions/`:
* **`security.md`**: Políticas de cifrado (`bcrypt`), cabeceras HTTP (`helmet`), consultas parametrizadas contra SQL Injection, validación de campos y manejo de cookies HttpOnly para sesiones.
* **`api-docs.md`**: Documentación obligatoria de todos los endpoints utilizando Swagger / OpenAPI con comentarios JSDoc.