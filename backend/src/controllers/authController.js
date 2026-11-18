const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_COOKIE_CLEAR_OPTIONS,
  JWT_SECRET,
  JWT_EXPIRES_IN
} = require('../config/session');

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await authService.authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign({}, JWT_SECRET, {
      subject: user.userId,
      expiresIn: JWT_EXPIRES_IN
    });

    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Inicio de sesión exitoso.', data: user });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = (req, res) => {
  return res.status(200).json({ data: req.user });
};

const logout = (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_CLEAR_OPTIONS);
  return res.status(200).json({ message: 'Sesión cerrada.' });
};

module.exports = {
  login,
  getCurrentUser,
  logout
};
