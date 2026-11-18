const { body, param, query } = require('express-validator');

const inventoryQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('El término de búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('El término de búsqueda no puede superar 100 caracteres.')
];

const createInventoryValidation = [
  body('productCode')
    .isString()
    .withMessage('El código debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El código del producto es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El código no puede superar 50 caracteres.'),
  body('description')
    .isString()
    .withMessage('La descripción debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria.')
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede superar 2000 caracteres.'),
  body('purchasePrice')
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio de compra debe ser un número positivo válido.')
    .toFloat(),
  body('salePrice')
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio de venta debe ser un número positivo válido.')
    .toFloat(),
  body('discountPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio con descuento debe ser un número positivo válido.')
    .toFloat(),
  body('stock')
    .optional()
    .isInt({ min: 0, max: 2147483647 })
    .withMessage('El stock debe ser un número entero igual o mayor que cero.')
    .toInt(),
  body('stockMax')
    .isInt({ min: 1, max: 2147483647 })
    .withMessage('El stock máximo debe ser un entero mayor que cero.')
    .toInt()
];

const productCodeParamValidation = [
  param('productCode')
    .trim()
    .notEmpty()
    .withMessage('El código del producto es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El código no puede superar 50 caracteres.')
];

const updateInventoryValidation = [
  ...productCodeParamValidation,
  body('description')
    .isString()
    .withMessage('La descripción debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria.')
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede superar 2000 caracteres.'),
  body('purchasePrice')
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio de compra debe ser un número positivo válido.')
    .toFloat(),
  body('salePrice')
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio de venta debe ser un número positivo válido.')
    .toFloat(),
  body('discountPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio con descuento debe ser un número positivo válido.')
    .toFloat(),
  body('stockMax')
    .isInt({ min: 1, max: 2147483647 })
    .withMessage('El stock máximo debe ser un entero mayor que cero.')
    .toInt()
];

const replenishStockValidation = [
  ...productCodeParamValidation,
  body('quantity')
    .isInt({ min: 1, max: 2147483647 })
    .withMessage('La cantidad a reabastecer debe ser un entero mayor que cero.')
    .toInt()
];

const deleteInventoryValidation = productCodeParamValidation;

module.exports = {
  inventoryQueryValidation,
  createInventoryValidation,
  updateInventoryValidation,
  replenishStockValidation,
  deleteInventoryValidation
};