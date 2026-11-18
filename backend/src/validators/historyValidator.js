const { query } = require('express-validator');

const historyQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede superar 100 caracteres.'),
  query('from')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('La fecha inicial no es válida.'),
  query('to')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('La fecha final no es válida.')
    .custom((value, { req }) => {
      if (value && req.query.from && value < req.query.from) {
        throw new Error('La fecha final debe ser igual o posterior a la fecha inicial.');
      }
      return true;
    }),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un entero positivo.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100.')
    .toInt()
];

module.exports = {
  historyQueryValidation
};