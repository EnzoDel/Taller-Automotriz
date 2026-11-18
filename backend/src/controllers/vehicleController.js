const vehicleService = require('../services/vehicleService');

const getMaintenanceAlerts = async (req, res, next) => {
  try {
    const data = await vehicleService.getMaintenanceAlerts();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    const data = await vehicleService.getVehicles(req.query.q);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const data = await vehicleService.createVehicle(req.body);
    return res.status(201).json({ message: 'Vehículo registrado.', data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un vehículo con esa placa.' });
    }
    if (error.code === '23503') {
      return res.status(404).json({ message: 'No se encontró el cliente seleccionado.' });
    }

    return next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const data = await vehicleService.updateVehicle(req.params.plate, req.body);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el vehículo solicitado.' });
    }

    return res.status(200).json({ message: 'Vehículo actualizado.', data });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ message: 'No se encontró el cliente seleccionado.' });
    }

    return next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const data = await vehicleService.deleteVehicle(req.params.plate);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el vehículo solicitado.' });
    }

    return res.status(200).json({ message: 'Vehículo eliminado.', data });
  } catch (error) {
    if (error.code === 'VEHICLE_HAS_WORK_ORDERS') {
      return res.status(409).json({ message: error.message });
    }

    return next(error);
  }
};

module.exports = {
  getMaintenanceAlerts,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
};