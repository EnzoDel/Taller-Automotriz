const errorHandler = (err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' && (err.status || 500) >= 500
      ? 'Ha ocurrido un error inesperado.'
      : err.message || 'Ha ocurrido un error inesperado.',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;
