CREATE TABLE IF NOT EXISTS sri_comprobantes (
    id BIGSERIAL PRIMARY KEY,
    numero_factura INT NOT NULL UNIQUE
        REFERENCES facturacion(numero_factura) ON DELETE CASCADE,
    ambiente VARCHAR(10) NOT NULL
        CHECK (ambiente IN ('test', 'production')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (estado IN ('pending', 'signed', 'sent', 'authorized', 'rejected', 'error')),
    clave_acceso VARCHAR(49) UNIQUE
        CHECK (clave_acceso IS NULL OR clave_acceso ~ '^[0-9]{49}$'),
    numero_autorizacion VARCHAR(64),
    fecha_autorizacion TIMESTAMPTZ,
    xml_firmado TEXT,
    respuesta_sri JSONB,
    mensaje_error TEXT,
    intentos INT NOT NULL DEFAULT 0 CHECK (intentos >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sri_comprobantes_estado
    ON sri_comprobantes (estado, actualizado_en);
