const { body, param, query } = require('express-validator');

const clientQueryValidation = [
  query('q')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede superar 100 caracteres.')
];

const clientCreateValidation = [
  body('clientId')
    .isString()
    .withMessage('La cédula debe ser texto.')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('La cédula debe contener 10 dígitos.'),
  body('name')
    .isString()
    .withMessage('El nombre debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar 100 caracteres.'),
  body('phone')
    .isString()
    .withMessage('El teléfono debe ser texto.')
    .trim()
    .matches(/^\d{7,10}$/)
    .withMessage('El teléfono debe contener entre 7 y 10 dígitos.'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('El correo no es válido.')
    .isLength({ max: 100 })
    .withMessage('El correo no puede superar 100 caracteres.')
    .normalizeEmail(),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('La dirección debe ser texto.')
    .trim(),
  body('whatsappOptIn')
    .optional()
    .isBoolean()
    .withMessage('El consentimiento de WhatsApp debe ser booleano.')
    .toBoolean()
];

const clientIdValidation = [
  param('clientId')
    .matches(/^\d{10}$/)
    .withMessage('El identificador debe ser una cédula de 10 dígitos.')
];

const clientUpdateValidation = [
  ...clientIdValidation,
  body('name')
    .isString()
    .withMessage('El nombre debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar 100 caracteres.'),
  body('phone')
    .isString()
    .withMessage('El teléfono debe ser texto.')
    .trim()
    .matches(/^\d{7,10}$/)
    .withMessage('El teléfono debe contener entre 7 y 10 dígitos.'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('El correo no es válido.')
    .isLength({ max: 100 })
    .withMessage('El correo no puede superar 100 caracteres.')
    .normalizeEmail(),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('La dirección debe ser texto.')
    .trim(),
  body('whatsappOptIn')
    .optional()
    .isBoolean()
    .withMessage('El consentimiento de WhatsApp debe ser booleano.')
    .toBoolean()
];

module.exports = {
  clientQueryValidation,
  clientCreateValidation,
  clientIdValidation,
  clientUpdateValidation
};