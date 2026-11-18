-- ========================================================
-- Script Final Normalizado - Sistema Taller Automotriz
-- ========================================================

CREATE TABLE usuarios (
    cedula VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(10) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL
);

CREATE TABLE clientes (
    cedula_cliente VARCHAR(10) PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    telefono_cliente VARCHAR(10) NOT NULL,
    correo_cliente VARCHAR(100),
    direccion_cliente TEXT,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_opt_in_at TIMESTAMPTZ
);

CREATE TABLE vehiculos (
    placa VARCHAR(20) PRIMARY KEY,
    cedula_cliente VARCHAR(10) NOT NULL REFERENCES clientes(cedula_cliente) ON DELETE CASCADE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    color VARCHAR(30),
    anio INT NOT NULL,
    kilometraje NUMERIC(10, 2) NOT NULL,
    tipo_combustible VARCHAR(30),
    fecha_mantenimiento DATE,
    proximo_mantenimiento DATE
);

CREATE TABLE inventario (
    codigo_producto VARCHAR(50) PRIMARY KEY,
    descripcion TEXT NOT NULL,
    precio_compra NUMERIC(10, 2) NOT NULL,
    precio_venta NUMERIC(10, 2) NOT NULL,
    precio_descuento NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 0
);

-- Tabla de Orden de Trabajo (Recepción / Check-in)
CREATE TABLE orden_trabajo (
    cod_orden SERIAL PRIMARY KEY,
    placa VARCHAR(20) NOT NULL REFERENCES vehiculos(placa) ON DELETE CASCADE,
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_salida TIMESTAMP,
    trabajos_solicitados TEXT NOT NULL,
    trabajos_a_realizar TEXT,
    observaciones TEXT,
    operario_encargado VARCHAR(100)
);

-- Bitácora de lo realizado al cerrar el proceso
CREATE TABLE historico (
    id SERIAL PRIMARY KEY,
    cod_orden INT NOT NULL REFERENCES orden_trabajo(cod_orden) ON DELETE CASCADE,
    fecha_salida TIMESTAMP NOT NULL,
    trabajo_realizado TEXT NOT NULL
);

-- Cabecera de Facturación (Totales globales de la venta)
CREATE TABLE facturacion (
    numero_factura SERIAL PRIMARY KEY,
    cod_orden INT NOT NULL REFERENCES orden_trabajo(cod_orden) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL,
    iva NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de Factura (Líneas individuales de productos o servicios cobrados)
CREATE TABLE detalle_factura (
    id SERIAL PRIMARY KEY,
    numero_factura INT NOT NULL REFERENCES facturacion(numero_factura) ON DELETE CASCADE,
    codigo_producto VARCHAR(50) REFERENCES inventario(codigo_producto),
    descripcion VARCHAR(150) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    total_linea NUMERIC(10, 2) NOT NULL -- Total específico de esta línea (cantidad * precio_unitario)
);

-- Registro de compras de repuestos (alimenta los reportes de gastos)
CREATE TABLE compras_repuestos (
    id SERIAL PRIMARY KEY,
    codigo_producto VARCHAR(50) NOT NULL REFERENCES inventario(codigo_producto) ON DELETE CASCADE,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    fecha_compra TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compras_repuestos_fecha ON compras_repuestos (fecha_compra);
CREATE INDEX idx_facturacion_fecha_emision ON facturacion (fecha_emision);