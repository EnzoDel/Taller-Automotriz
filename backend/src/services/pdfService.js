const PDFDocument = require('pdfkit');

const createPdfBuffer = (drawDocument) => new Promise((resolve, reject) => {
  const document = new PDFDocument({ size: 'A4', margin: 42, info: { Author: 'Taller Automotriz' } });
  const chunks = [];

  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);

  try {
    drawDocument(document);
    document.end();
  } catch (error) {
    reject(error);
  }
});

const addTitle = (document, title, number, date) => {
  document.font('Helvetica-Bold').fontSize(19).fillColor('#0f172a').text('TALLER AUTOMOTRIZ');
  document.moveDown(0.25);
  document.font('Helvetica-Bold').fontSize(15).fillColor('#0369a1').text(title);
  document.font('Helvetica').fontSize(10).fillColor('#475569').text(`Número: ${number}    Fecha: ${date}`);
  document.moveDown(0.8);
};

const addSection = (document, title) => {
  document.moveDown(0.4);
  document.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(title.toUpperCase());
  document.moveTo(document.x, document.y + 3).lineTo(553, document.y + 3).strokeColor('#cbd5e1').stroke();
  document.moveDown(0.35);
};

const addField = (document, label, value) => {
  document.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(`${label}: `, { continued: true });
  document.font('Helvetica').fontSize(9).fillColor('#0f172a').text(value || '—');
};

const createWorkOrderPdf = async (order) => createPdfBuffer((document) => {
  addTitle(document, 'ORDEN DE TRABAJO', `OT-${String(order.workOrderId).padStart(5, '0')}`, order.entryDateText);

  addSection(document, 'Datos del cliente');
  addField(document, 'Cliente', order.clientName);
  addField(document, 'Teléfono', order.clientPhone);

  addSection(document, 'Vehículo');
  addField(document, 'Placa', order.plate);
  addField(document, 'Marca / modelo', `${order.make} ${order.model}`);
  addField(document, 'Año', String(order.year));
  addField(document, 'Kilometraje', `${Number(order.mileage).toLocaleString('es-EC')} km`);

  addSection(document, 'Recepción');
  addField(document, 'Operario encargado', order.assignedOperator);
  addField(document, 'Estado', order.exitDate ? 'Cerrada' : 'En taller');
  if (order.exitDateText) {
    addField(document, 'Fecha de salida', order.exitDateText);
  }

  addSection(document, 'Trabajos solicitados');
  document.font('Helvetica').fontSize(10).fillColor('#0f172a').text(order.requestedJobs || '—', { width: 510 });

  if (order.plannedJobs) {
    addSection(document, 'Trabajos a realizar');
    document.font('Helvetica').fontSize(10).fillColor('#0f172a').text(order.plannedJobs, { width: 510 });
  }
  if (order.observations) {
    addSection(document, 'Observaciones');
    document.font('Helvetica').fontSize(10).fillColor('#0f172a').text(order.observations, { width: 510 });
  }
  if (order.workPerformed) {
    addSection(document, 'Trabajo realizado');
    document.font('Helvetica').fontSize(10).fillColor('#0f172a').text(order.workPerformed, { width: 510 });
  }

  document.moveDown(2);
  document.font('Helvetica').fontSize(8).fillColor('#64748b').text('Documento interno del taller.', { align: 'center' });
});

const createInvoicePdf = async (invoice) => createPdfBuffer((document) => {
  addTitle(document, 'COMPROBANTE INTERNO', `F-${String(invoice.invoiceNumber).padStart(6, '0')}`, invoice.issuedAtText);

  addSection(document, 'Orden y cliente');
  addField(document, 'Orden', `OT-${String(invoice.orderId).padStart(5, '0')}`);
  addField(document, 'Cliente', invoice.clientName);
  addField(document, 'Teléfono', invoice.clientPhone);
  addField(document, 'Vehículo', `${invoice.plate} · ${invoice.make} ${invoice.model}`);

  addSection(document, 'Detalle');
  const descriptionX = 42;
  const quantityX = 340;
  const priceX = 405;
  const totalX = 490;
  const drawTableHeader = () => {
    document.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
    document.text('DESCRIPCIÓN', descriptionX, document.y, { width: 285 });
    document.text('CANT.', quantityX, document.y - 9, { width: 48, align: 'right' });
    document.text('PRECIO', priceX, document.y - 9, { width: 70, align: 'right' });
    document.text('TOTAL', totalX, document.y - 9, { width: 63, align: 'right' });
    document.moveDown(0.5);
    document.moveTo(42, document.y).lineTo(553, document.y).strokeColor('#cbd5e1').stroke();
    document.moveDown(0.35);
  };

  drawTableHeader();
  for (const item of invoice.items) {
    const rowHeight = Math.max(24, document.heightOfString(item.description, { width: 285 }) + 8);
    if (document.y + rowHeight > 710) {
      document.addPage();
      drawTableHeader();
    }

    const rowY = document.y;
    document.font('Helvetica').fontSize(9).fillColor('#0f172a');
    document.text(item.description, descriptionX, rowY, { width: 285 });
    document.text(String(item.quantity), quantityX, rowY, { width: 48, align: 'right' });
    document.text(`$${Number(item.unitPrice).toFixed(2)}`, priceX, rowY, { width: 70, align: 'right' });
    document.text(`$${Number(item.lineTotal).toFixed(2)}`, totalX, rowY, { width: 63, align: 'right' });
    document.y = rowY + rowHeight;
  }

  document.moveDown(0.6);
  document.moveTo(330, document.y).lineTo(553, document.y).strokeColor('#cbd5e1').stroke();
  document.moveDown(0.5);
  document.font('Helvetica').fontSize(10).fillColor('#334155');
  document.text(`Subtotal: $${Number(invoice.subtotal).toFixed(2)}`, 330, document.y, { width: 223, align: 'right' });
  document.text(`IVA: $${Number(invoice.iva).toFixed(2)}`, 330, document.y + 16, { width: 223, align: 'right' });
  document.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a');
  document.text(`TOTAL: $${Number(invoice.total).toFixed(2)}`, 330, document.y + 34, { width: 223, align: 'right' });

  document.moveDown(4);
  document.font('Helvetica-Bold').fontSize(8).fillColor('#b45309').text(
    'COMPROBANTE INTERNO: no es un comprobante electrónico autorizado por el SRI.',
    { align: 'center', width: 510 }
  );
});

module.exports = {
  createWorkOrderPdf,
  createInvoicePdf
};