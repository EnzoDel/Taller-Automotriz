const billingService = require('../services/billingService');

const getInvoices = async (req, res, next) => {
  try {
    const data = await billingService.getInvoices(req.query.q);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getAvailableOrders = async (req, res, next) => {
  try {
    const data = await billingService.getAvailableOrders();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const data = await billingService.createInvoice(req.body);
    return res.status(201).json({ message: 'Factura registrada.', data });
  } catch (error) {
    if (error.code === 'ORDER_NOT_FOUND' || error.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'ORDER_ALREADY_INVOICED' || error.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'INVOICE_AMOUNT_OUT_OF_RANGE') {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
};

module.exports = {
  getInvoices,
  getAvailableOrders,
  createInvoice
};