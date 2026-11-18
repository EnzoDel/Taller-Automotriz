const { param } = require('express-validator');

const workOrderDocumentValidation = [
  param('workOrderId')
    .isInt({ min: 1 })
    .withMessage('El número de orden debe ser un entero positivo.')
    .toInt()
];

const invoiceDocumentValidation = [
  param('invoiceNumber')
    .isInt({ min: 1 })
    .withMessage('El número de factura debe ser un entero positivo.')
    .toInt()
];

module.exports = {
  workOrderDocumentValidation,
  invoiceDocumentValidation
};