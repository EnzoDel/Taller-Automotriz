const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe configurarse en producción.');
}
if (isProduction && Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET debe contener al menos 32 bytes en producción.');
}

const SESSION_COOKIE_NAME = 'taller_session';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: Number(process.env.SESSION_MAX_AGE_MS) || 24 * 60 * 60 * 1000
};
const SESSION_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/'
};
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET no está configurado; se usará una clave temporal de desarrollo.');
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_COOKIE_CLEAR_OPTIONS,
  JWT_SECRET,
  JWT_EXPIRES_IN
};