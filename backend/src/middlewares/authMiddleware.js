const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_CLEAR_OPTIONS,
  JWT_SECRET
} = require('../config/session');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'Debes iniciar sesión.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_CLEAR_OPTIONS);
    return res.status(401).json({ message: 'La sesión es inválida o expiró.' });
  }

  try {
    const user = await authService.getUserById(decoded.sub);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_CLEAR_OPTIONS);
      return res.status(401).json({ message: 'La cuenta ya no está disponible.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
