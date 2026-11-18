const requirePermission = (permission) => (req, res, next) => {
  if (!req.user?.permissions.includes(permission)) {
    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
  }

  return next();
};

module.exports = requirePermission;