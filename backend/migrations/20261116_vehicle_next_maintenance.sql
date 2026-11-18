ALTER TABLE vehiculos
    ADD COLUMN IF NOT EXISTS proximo_mantenimiento DATE;

CREATE INDEX IF NOT EXISTS idx_vehiculos_proximo_mantenimiento
    ON vehiculos (proximo_mantenimiento)
    WHERE proximo_mantenimiento IS NOT NULL;
