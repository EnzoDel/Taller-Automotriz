const { body, param } = require('express-validator');
const { ROLE_PERMISSIONS } = require('../config/permissions');

const userCreateValidation = [
  body('cedula')
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
    .isEmail()
    .withMessage('El correo no es válido.')
    .isLength({ max: 100 })
    .withMessage('El correo no puede superar 100 caracteres.')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .isLength({ min: 10 })
    .withMessage('La contraseña debe tener al menos 10 caracteres.')
    .isByteLength({ max: 72 })
    .withMessage('La contraseña no puede superar 72 bytes.'),
  body('role')
    .isIn(Object.keys(ROLE_PERMISSIONS))
    .withMessage('El rol debe ser administrador, recepcionista o mecanico.')
];

const userUpdateValidation = [
  param('userId')
    .matches(/^\d{10}$/)
    .withMessage('El identificador debe ser una cédula de 10 dígitos.'),
  body('name')
    .optional()
    .isString()
    .withMessage('El nombre debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar 100 caracteres.'),
  body('phone')
    .optional()
    .isString()
    .withMessage('El teléfono debe ser texto.')
    .trim()
    .matches(/^\d{7,10}$/)
    .withMessage('El teléfono debe contener entre 7 y 10 dígitos.'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('El correo no es válido.')
    .isLength({ max: 100 })
    .withMessage('El correo no puede superar 100 caracteres.')
    .normalizeEmail(),
  body('password')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .isLength({ min: 10 })
    .withMessage('La contraseña debe tener al menos 10 caracteres.')
    .isByteLength({ max: 72 })
    .withMessage('La contraseña no puede superar 72 bytes.'),
  body('role')
    .optional()
    .isIn(Object.keys(ROLE_PERMISSIONS))
    .withMessage('El rol debe ser administrador, recepcionista o mecanico.'),
  body().custom((value) => {
    const allowedFields = ['name', 'phone', 'email', 'password', 'role'];
    if (!value || !Object.keys(value).some((field) => allowedFields.includes(field))) {
      throw new Error('Envía al menos un campo válido para actualizar.');
    }
    if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
      throw new Error('El cuerpo contiene campos no permitidos.');
    }
    return true;
  })
];

const userIdValidation = [
  param('userId')
    .matches(/^\d{10}$/)
    .withMessage('El identificador debe ser una cédula de 10 dígitos.')
];

module.exports = {
  userCreateValidation,
  userUpdateValidation,
  userIdValidation
};