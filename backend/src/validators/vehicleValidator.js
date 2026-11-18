const { body, param, query } = require('express-validator');

const vehicleQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede superar 100 caracteres.')
];

const vehiclePlateValidation = [
  param('plate')
    .trim()
    .notEmpty()
    .withMessage('La placa es obligatoria.')
    .isLength({ max: 20 })
    .withMessage('La placa no puede superar 20 caracteres.')
];

const vehicleFields = [
  body('clientId')
    .isString()
    .withMessage('El cliente es obligatorio.')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('La cédula del cliente debe contener 10 dígitos.'),
  body('make')
    .isString()
    .withMessage('La marca debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('La marca es obligatoria.')
    .isLength({ max: 50 })
    .withMessage('La marca no puede superar 50 caracteres.'),
  body('model')
    .isString()
    .withMessage('El modelo debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El modelo es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El modelo no puede superar 50 caracteres.'),
  body('color')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('El color debe ser texto.')
    .trim()
    .isLength({ max: 30 })
    .withMessage('El color no puede superar 30 caracteres.'),
  body('year')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('El año debe ser un entero entre 1900 y 2100.')
    .toInt(),
  body('mileage')
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('El kilometraje debe ser un número positivo válido.')
    .toFloat(),
  body('fuelType')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('El tipo de combustible debe ser texto.')
    .trim()
    .isLength({ max: 30 })
    .withMessage('El tipo de combustible no puede superar 30 caracteres.')
];

const lastMaintenanceValidation =
  body('lastMaintenance')
    .custom((value) => value === undefined)
    .withMessage('La fecha del último mantenimiento no se puede establecer al registrar o editar el vehículo.');

const vehicleCreateValidation = [
  body('plate')
    .isString()
    .withMessage('La placa debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('La placa es obligatoria.')
    .isLength({ max: 20 })
    .withMessage('La placa no puede superar 20 caracteres.')
    .toUpperCase(),
  ...vehicleFields,
  lastMaintenanceValidation
];

const vehicleUpdateValidation = [
  ...vehiclePlateValidation,
  ...vehicleFields,
  lastMaintenanceValidation
];

module.exports = {
  vehicleQueryValidation,
  vehiclePlateValidation,
  vehicleCreateValidation,
  vehicleUpdateValidation
};