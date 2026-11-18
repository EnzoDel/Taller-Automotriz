const { body, query } = require('express-validator');

const invoiceQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede superar 100 caracteres.')
];

const createInvoiceValidation = [
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Selecciona una orden de trabajo válida.')
    .toInt(),
  body('ivaRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje de IVA debe estar entre 0 y 100.')
    .toFloat(),
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('La factura debe tener entre 1 y 50 líneas.'),
  body('items.*.productCode')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('El código de producto debe ser texto.')
    .trim()
    .isLength({ max: 50 })
    .withMessage('El código de producto no puede superar 50 caracteres.'),
  body('items.*.description')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('La descripción debe ser texto.')
    .trim()
    .isLength({ max: 150 })
    .withMessage('La descripción no puede superar 150 caracteres.'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('La cantidad debe ser un entero mayor que cero.')
    .toInt(),
  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El precio unitario debe ser un número no negativo válido.')
    .toFloat(),
  body('items').custom((items) => {
    if (!Array.isArray(items)) {
      return true;
    }

    const hasInvalidService = items.some((item) => {
      if (item.productCode) {
        return false;
      }

      return typeof item.description !== 'string'
        || item.description.trim().length === 0
        || !Number.isFinite(Number(item.unitPrice))
        || Number(item.unitPrice) < 0;
    });

    if (hasInvalidService) {
      throw new Error('Cada servicio debe tener descripción y precio unitario.');
    }

    return true;
  })
];

module.exports = {
  invoiceQueryValidation,
  createInvoiceValidation
};