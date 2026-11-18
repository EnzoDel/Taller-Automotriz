const inventoryService = require('../services/inventoryService');

const getInventory = async (req, res, next) => {
  try {
    const data = await inventoryService.getInventory(req.query.q);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createInventoryItem = async (req, res, next) => {
  try {
    const data = await inventoryService.createInventoryItem(req.body);
    return res.status(201).json({
      message: 'Producto agregado al inventario.',
      data
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un producto con ese código.' });
    }

    return next(error);
  }
};

const updateInventoryItem = async (req, res, next) => {
  try {
    const data = await inventoryService.updateInventoryItem(req.params.productCode, req.body);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el producto solicitado.' });
    }

    return res.status(200).json({ message: 'Producto actualizado.', data });
  } catch (error) {
    return next(error);
  }
};

const replenishInventoryStock = async (req, res, next) => {
  try {
    const data = await inventoryService.replenishInventoryStock(req.params.productCode, req.body.quantity);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el producto solicitado.' });
    }

    return res.status(200).json({ message: 'Stock reabastecido.', data });
  } catch (error) {
    if (error.code === '22003') {
      return res.status(400).json({ message: 'La cantidad supera el stock máximo permitido.' });
    }

    return next(error);
  }
};

const deleteInventoryItem = async (req, res, next) => {
  try {
    const data = await inventoryService.deleteInventoryItem(req.params.productCode);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el producto solicitado.' });
    }

    return res.status(200).json({ message: 'Producto eliminado.', data });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'No se puede eliminar el producto porque está asociado a una factura.'
      });
    }

    return next(error);
  }
};

module.exports = {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  replenishInventoryStock,
  deleteInventoryItem
};