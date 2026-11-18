const { query } = require('express-validator');

const MAX_YEAR_SPAN = 20;

const yearField = (name, label) => query(name)
  .optional()
  .isInt({ min: 2000, max: 2100 })
  .withMessage(`${label} debe ser un año entre 2000 y 2100.`)
  .toInt();

const reportYearValidation = [yearField('year', 'El año')];

const reportYearRangeValidation = [
  yearField('fromYear', 'El año inicial'),
  yearField('toYear', 'El año final').custom((value, { req }) => {
    if (req.query.fromYear !== undefined && value < Number(req.query.fromYear)) {
      throw new Error('El año final debe ser igual o posterior al año inicial.');
    }
    if (req.query.fromYear !== undefined && value - Number(req.query.fromYear) >= MAX_YEAR_SPAN) {
      throw new Error(`El rango no puede superar ${MAX_YEAR_SPAN} años.`);
    }
    return true;
  })
];

module.exports = {
  reportYearValidation,
  reportYearRangeValidation
};
