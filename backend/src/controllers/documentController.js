const workOrderService = require('../services/workOrderService');
const billingService = require('../services/billingService');
const { createWorkOrderPdf, createInvoicePdf } = require('../services/pdfService');
const { sendDocumentTemplate } = require('../services/whatsappService');

const formatDocumentDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  : '—';

const sendPdfError = (error, res, next) => {
  if (error.code === 'WHATSAPP_NOT_CONFIGURED') {
    return res.status(503).json({ message: 'El envío por WhatsApp no está configurado en el servidor.' });
  }
  if (error.code === 'WHATSAPP_INVALID_PHONE') {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 'WHATSAPP_MEDIA_UPLOAD_FAILED' || error.code === 'WHATSAPP_SEND_FAILED') {
    return res.status(502).json({ message: error.message });
  }

  return next(error);
};

const downloadWorkOrderPdf = async (req, res, next) => {
  try {
    const order = await workOrderService.getWorkOrderById(req.params.workOrderId);
    if (!order) {
      return res.status(404).json({ message: 'No se encontró la orden de trabajo.' });
    }

    order.entryDateText = formatDocumentDate(order.entryDate);
    order.exitDateText = order.exitDate ? formatDocumentDate(order.exitDate) : null;
    const pdf = await createWorkOrderPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="orden-${order.workOrderId}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    return next(error);
  }
};

const sendWorkOrderPdfWhatsApp = async (req, res, next) => {
  try {
    const order = await workOrderService.getWorkOrderById(req.params.workOrderId);
    if (!order) {
      return res.status(404).json({ message: 'No se encontró la orden de trabajo.' });
    }
    if (!order.whatsappOptIn) {
      return res.status(409).json({ message: 'El cliente no ha autorizado recibir documentos por WhatsApp.' });
    }

    order.entryDateText = formatDocumentDate(order.entryDate);
    order.exitDateText = order.exitDate ? formatDocumentDate(order.exitDate) : null;
    const filename = `orden-${order.workOrderId}.pdf`;
    const pdfBuffer = await createWorkOrderPdf(order);
    const result = await sendDocumentTemplate({
      phone: order.clientPhone,
      customerName: order.clientName,
      documentType: 'orden de trabajo',
      documentNumber: `OT-${String(order.workOrderId).padStart(5, '0')}`,
      filename,
      pdfBuffer
    });

    return res.status(200).json({ message: 'Orden enviada por WhatsApp.', data: result });
  } catch (error) {
    return sendPdfError(error, res, next);
  }
};

const downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await billingService.getInvoiceByNumber(req.params.invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ message: 'No se encontró la factura.' });
    }

    invoice.issuedAtText = formatDocumentDate(invoice.issuedAt);
    const pdf = await createInvoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comprobante-interno-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    return next(error);
  }
};

const sendInvoicePdfWhatsApp = async (req, res, next) => {
  try {
    const invoice = await billingService.getInvoiceByNumber(req.params.invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ message: 'No se encontró la factura.' });
    }
    if (!invoice.whatsappOptIn) {
      return res.status(409).json({ message: 'El cliente no ha autorizado recibir documentos por WhatsApp.' });
    }

    invoice.issuedAtText = formatDocumentDate(invoice.issuedAt);
    const filename = `comprobante-interno-${invoice.invoiceNumber}.pdf`;
    const pdfBuffer = await createInvoicePdf(invoice);
    const result = await sendDocumentTemplate({
      phone: invoice.clientPhone,
      customerName: invoice.clientName,
      documentType: 'comprobante interno',
      documentNumber: `F-${String(invoice.invoiceNumber).padStart(6, '0')}`,
      filename,
      pdfBuffer
    });

    return res.status(200).json({ message: 'Comprobante interno enviado por WhatsApp.', data: result });
  } catch (error) {
    return sendPdfError(error, res, next);
  }
};

module.exports = {
  downloadWorkOrderPdf,
  sendWorkOrderPdfWhatsApp,
  downloadInvoicePdf,
  sendInvoicePdfWhatsApp
};