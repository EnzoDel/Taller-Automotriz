import api from './api';

export const downloadPdf = async (endpoint, filename) => {
  const response = await api.get(endpoint, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const sendPdfByWhatsApp = (endpoint) => api.post(endpoint);