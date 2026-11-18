ALTER TABLE inventario
    ADD COLUMN IF NOT EXISTS stock_max INT
    CHECK (stock_max IS NULL OR stock_max > 0);
