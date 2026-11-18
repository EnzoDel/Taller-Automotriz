const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && configuredOrigins.length === 0) {
  throw new Error('FRONTEND_ORIGINS debe configurarse en producción.');
}

for (const origin of configuredOrigins) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    throw new Error('FRONTEND_ORIGINS contiene un origen inválido.');
  }
  if (url.origin !== origin || !['https:', ...(isProduction ? [] : ['http:'])].includes(url.protocol)) {
    throw new Error('FRONTEND_ORIGINS debe contener orígenes válidos; en producción se requiere HTTPS.');
  }
}

module.exports = isProduction
  ? configuredOrigins
  : [...new Set(['http://localhost:5173', 'http://127.0.0.1:5173', ...configuredOrigins])];
