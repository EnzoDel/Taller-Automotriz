const allowedOrigins = require('../config/origins');

module.exports = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (!allowedOrigins.includes(req.get('Origin'))) {
    return res.status(403).json({ message: 'Origen de la solicitud no autorizado.' });
  }
  return next();
};
