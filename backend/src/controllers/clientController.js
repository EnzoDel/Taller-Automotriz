const clientService = require('../services/clientService');

const getClients = async (req, res, next) => {
  try {
    const data = await clientService.getClients(req.query.q);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getClientOptions = async (req, res, next) => {
  try {
    const data = await clientService.getClientOptions();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const data = await clientService.createClient(req.body);
    return res.status(201).json({ message: 'Cliente registrado.', data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un cliente con esa cédula.' });
    }

    return next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const data = await clientService.updateClient(req.params.clientId, req.body);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el cliente solicitado.' });
    }

    return res.status(200).json({ message: 'Cliente actualizado.', data });
  } catch (error) {
    return next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const data = await clientService.deleteClient(req.params.clientId);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el cliente solicitado.' });
    }

    return res.status(200).json({ message: 'Cliente eliminado.', data });
  } catch (error) {
    if (error.code === 'CLIENT_HAS_VEHICLES' || error.code === '23503') {
      return res.status(409).json({
        message: error.message || 'No se puede eliminar el cliente porque tiene vehículos asociados.'
      });
    }

    return next(error);
  }
};

module.exports = {
  getClients,
  getClientOptions,
  createClient,
  updateClient,
  deleteClient
};