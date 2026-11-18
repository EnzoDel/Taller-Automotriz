-- Registro de compras de repuestos para la reportería de gastos.
-- Las compras anteriores a esta migración no se pueden reconstruir y no se incluyen.
CREATE TABLE IF NOT EXISTS compras_repuestos (
    id SERIAL PRIMARY KEY,
    codigo_producto VARCHAR(50) NOT NULL REFERENCES inventario(codigo_producto) ON DELETE CASCADE,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    fecha_compra TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compras_repuestos_fecha ON compras_repuestos (fecha_compra);
CREATE INDEX IF NOT EXISTS idx_facturacion_fecha_emision ON facturacion (fecha_emision);
