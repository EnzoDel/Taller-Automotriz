const { body } = require('express-validator');

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('El email no es válido.')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .notEmpty()
    .withMessage('La contraseña es obligatoria.')
    .isLength({ max: 72 })
    .withMessage('La contraseña no puede superar 72 caracteres.')
];

module.exports = {
  loginValidation
};
