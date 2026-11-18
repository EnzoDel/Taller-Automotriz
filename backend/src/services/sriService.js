const fs = require('fs');
const { URL } = require('url');

const isHttpsUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const isReadableFile = async (filePath) => {
  if (!filePath) {
    return false;
  }

  try {
    const file = await fs.promises.stat(filePath);
    if (!file.isFile()) {
      return false;
    }

    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if (['EACCES', 'ENOENT', 'EPERM'].includes(error.code)) {
      return false;
    }
    throw error;
  }
};

const getConfigurationStatus = async () => {
  const environment = process.env.SRI_ENVIRONMENT;
  const missing = [];

  if (!['test', 'production'].includes(environment)) {
    missing.push('Ambiente SRI válido (test o production)');
  }
  if (!/^\d{13}$/.test(process.env.SRI_RUC || '')) {
    missing.push('RUC del emisor de 13 dígitos');
  }
  if (!process.env.SRI_BUSINESS_NAME?.trim()) {
    missing.push('Razón social del emisor');
  }
  if (!process.env.SRI_HEAD_OFFICE_ADDRESS?.trim()) {
    missing.push('Dirección matriz del emisor');
  }
  if (!/^\d{3}$/.test(process.env.SRI_ESTABLISHMENT_CODE || '')) {
    missing.push('Código de establecimiento de 3 dígitos');
  }
  if (!/^\d{3}$/.test(process.env.SRI_EMISSION_POINT || '')) {
    missing.push('Punto de emisión de 3 dígitos');
  }
  if (!['true', 'false'].includes(process.env.SRI_ACCOUNTING_REQUIRED || '')) {
    missing.push('Obligación de llevar contabilidad (true o false)');
  }
  if (!isHttpsUrl(process.env.SRI_RECEIVE_URL)) {
    missing.push('URL HTTPS del servicio de recepción');
  }
  if (!isHttpsUrl(process.env.SRI_AUTHORIZATION_URL)) {
    missing.push('URL HTTPS del servicio de autorización');
  }
  if (!process.env.SRI_CERTIFICATE_PASSWORD) {
    missing.push('Contraseña del certificado de firma');
  }

  const certificateAccessible = await isReadableFile(process.env.SRI_CERTIFICATE_PATH);
  if (!certificateAccessible) {
    missing.push('Certificado de firma accesible desde el servidor');
  }

  return {
    environment: ['test', 'production'].includes(environment) ? environment : null,
    configurationComplete: missing.length === 0,
    certificateFileAccessible: certificateAccessible,
    missing
  };
};

module.exports = {
  getConfigurationStatus
};
