const { body, param, query } = require('express-validator');

const workOrderQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede superar 100 caracteres.')
];

const workOrderCreateValidation = [
  body('plate')
    .isString()
    .withMessage('La placa debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('Selecciona el vehículo que ingresa al taller.')
    .isLength({ max: 20 })
    .withMessage('La placa no puede superar 20 caracteres.'),
  body('requestedJobs')
    .isString()
    .withMessage('Los trabajos solicitados deben ser texto.')
    .trim()
    .notEmpty()
    .withMessage('Describe los trabajos solicitados por el cliente.')
    .isLength({ max: 5000 })
    .withMessage('Los trabajos solicitados no pueden superar 5000 caracteres.'),
  body('plannedJobs')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Los trabajos planificados deben ser texto.')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Los trabajos planificados no pueden superar 5000 caracteres.'),
  body('observations')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Las observaciones deben ser texto.')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Las observaciones no pueden superar 5000 caracteres.'),
  body('assignedOperator')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('El operario debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('El nombre del operario no puede superar 100 caracteres.')
];

const closeWorkOrderValidation = [
  param('workOrderId')
    .isInt({ min: 1 })
    .withMessage('El número de orden no es válido.')
    .toInt(),
  body('workPerformed')
    .isString()
    .withMessage('El trabajo realizado debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('Describe el trabajo realizado antes de cerrar la orden.')
    .isLength({ max: 5000 })
    .withMessage('El trabajo realizado no puede superar 5000 caracteres.'),
  body('nextMaintenance')
    .isString()
    .withMessage('La fecha del próximo mantenimiento es obligatoria.')
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha del próximo mantenimiento debe tener el formato AAAA-MM-DD.')
    .bail()
    .isISO8601({ strict: true })
    .withMessage('La fecha del próximo mantenimiento no es válida.')
    .bail()
    .custom((value) => Number(value.slice(0, 4)) > 0)
    .withMessage('El año del próximo mantenimiento no es válido.')
];

module.exports = {
  workOrderQueryValidation,
  workOrderCreateValidation,
  closeWorkOrderValidation
};