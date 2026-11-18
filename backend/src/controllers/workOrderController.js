const workOrderService = require('../services/workOrderService');

const getWorkOrders = async (req, res, next) => {
  try {
    const data = await workOrderService.getWorkOrders(req.query.q);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createWorkOrder = async (req, res, next) => {
  try {
    const data = await workOrderService.createWorkOrder(req.body);
    return res.status(201).json({ message: 'Orden de trabajo ingresada.', data });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ message: 'No se encontró el vehículo seleccionado.' });
    }

    return next(error);
  }
};

const closeWorkOrder = async (req, res, next) => {
  try {
    const data = await workOrderService.closeWorkOrder(req.params.workOrderId, req.body.workPerformed, req.body.nextMaintenance);
    return res.status(200).json({ message: 'Orden cerrada y enviada al historial.', data });
  } catch (error) {
    if (error.code === 'WORK_ORDER_NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'WORK_ORDER_ALREADY_CLOSED') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'INVALID_NEXT_MAINTENANCE') {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
};

module.exports = {
  getWorkOrders,
  createWorkOrder,
  closeWorkOrder
};