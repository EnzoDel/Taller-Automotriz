const normalizeEcuadorianPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('593') && digits.length >= 12 && digits.length <= 15) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `593${digits}`;
  }

  const error = new Error('El teléfono del cliente no tiene un formato ecuatoriano válido.');
  error.code = 'WHATSAPP_INVALID_PHONE';
  throw error;
};

const getConfig = () => {
  const config = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es'
  };

  if (!config.accessToken || !config.phoneNumberId || !config.graphApiVersion || !config.templateName) {
    const error = new Error('WhatsApp Cloud API no está configurado en backend/.env.');
    error.code = 'WHATSAPP_NOT_CONFIGURED';
    throw error;
  }

  return config;
};

const uploadDocument = async (buffer, filename, config) => {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}` },
      body: form
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    const error = new Error('WhatsApp no pudo recibir el PDF. Revisa la configuración de Meta.');
    error.code = 'WHATSAPP_MEDIA_UPLOAD_FAILED';
    throw error;
  }

  return data.id;
};

const sendDocumentTemplate = async ({ phone, customerName, documentType, documentNumber, filename, pdfBuffer }) => {
  const config = getConfig();
  const recipient = normalizeEcuadorianPhone(phone);
  const mediaId = await uploadDocument(pdfBuffer, filename, config);

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            {
              type: 'header',
              parameters: [{ type: 'document', document: { id: mediaId, filename } }]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: documentType },
                { type: 'text', text: documentNumber }
              ]
            }
          ]
        }
      })
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.messages?.[0]?.id) {
    const error = new Error('WhatsApp rechazó el envío. Verifica que la plantilla esté aprobada y configurada.');
    error.code = 'WHATSAPP_SEND_FAILED';
    throw error;
  }

  return { messageId: data.messages[0].id };
};

module.exports = {
  sendDocumentTemplate
};