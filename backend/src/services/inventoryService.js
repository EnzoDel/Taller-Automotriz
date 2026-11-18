const database = require('../config/database');

const getInventory = async (searchTerm) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const result = await database.query(
    `SELECT
      codigo_producto AS "productCode",
      descripcion AS description,
      precio_compra AS "purchasePrice",
      precio_venta AS "salePrice",
      precio_descuento AS "discountPrice",
      stock,
      stock_max AS "stockMax"
    FROM inventario
    WHERE $1::text IS NULL
      OR codigo_producto ILIKE $1
      OR descripcion ILIKE $1
    ORDER BY descripcion ASC`,
    [searchPattern]
  );

  return result.rows;
};

const createInventoryItem = async (inventoryItem) => {
  const {
    productCode,
    description,
    purchasePrice,
    salePrice,
    discountPrice,
    stock = 0,
    stockMax
  } = inventoryItem;

  // El stock inicial también se registra como compra para los reportes de gastos.
  const result = await database.query(
    `WITH created AS (
      INSERT INTO inventario (
        codigo_producto,
        descripcion,
        precio_compra,
        precio_venta,
        precio_descuento,
        stock,
        stock_max
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING codigo_producto, descripcion, precio_compra, precio_venta, precio_descuento, stock, stock_max
    ), purchase AS (
      INSERT INTO compras_repuestos (codigo_producto, cantidad, precio_unitario, total)
      SELECT codigo_producto, stock, precio_compra, stock * precio_compra
      FROM created
      WHERE stock > 0
    )
    SELECT
      codigo_producto AS "productCode",
      descripcion AS description,
      precio_compra AS "purchasePrice",
      precio_venta AS "salePrice",
      precio_descuento AS "discountPrice",
      stock,
      stock_max AS "stockMax"
    FROM created`,
    [productCode, description, purchasePrice, salePrice, discountPrice ?? null, stock, stockMax]
  );

  return result.rows[0];
};

const updateInventoryItem = async (productCode, inventoryItem) => {
  const { description, purchasePrice, salePrice, discountPrice, stockMax } = inventoryItem;
  const result = await database.query(
    `UPDATE inventario
    SET descripcion = $2,
        precio_compra = $3,
        precio_venta = $4,
        precio_descuento = $5,
        stock_max = $6
    WHERE codigo_producto = $1
    RETURNING
      codigo_producto AS "productCode",
      descripcion AS description,
      precio_compra AS "purchasePrice",
      precio_venta AS "salePrice",
      precio_descuento AS "discountPrice",
      stock,
      stock_max AS "stockMax"`,
    [productCode, description, purchasePrice, salePrice, discountPrice ?? null, stockMax]
  );

  return result.rows[0] || null;
};

const replenishInventoryStock = async (productCode, quantity) => {
  // El reabastecimiento se registra como compra al precio de compra vigente.
  const result = await database.query(
    `WITH updated AS (
      UPDATE inventario
      SET stock = stock + $2
      WHERE codigo_producto = $1
      RETURNING codigo_producto, descripcion, precio_compra, precio_venta, precio_descuento, stock, stock_max
    ), purchase AS (
      INSERT INTO compras_repuestos (codigo_producto, cantidad, precio_unitario, total)
      SELECT codigo_producto, $2::int, precio_compra, $2::int * precio_compra
      FROM updated
    )
    SELECT
      codigo_producto AS "productCode",
      descripcion AS description,
      precio_compra AS "purchasePrice",
      precio_venta AS "salePrice",
      precio_descuento AS "discountPrice",
      stock,
      stock_max AS "stockMax"
    FROM updated`,
    [productCode, quantity]
  );

  return result.rows[0] || null;
};

const deleteInventoryItem = async (productCode) => {
  const result = await database.query(
    'DELETE FROM inventario WHERE codigo_producto = $1 RETURNING codigo_producto AS "productCode"',
    [productCode]
  );

  return result.rows[0] || null;
};

module.exports = {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  replenishInventoryStock,
  deleteInventoryItem
};