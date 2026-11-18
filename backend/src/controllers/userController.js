const userService = require('../services/userService');

const getUsers = async (req, res, next) => {
  try {
    const data = await userService.getUsers();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = await userService.createUser(req.body);
    return res.status(201).json({ message: 'Usuario creado.', data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'La cédula o el correo ya están registrados.' });
    }

    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  if (req.params.userId === req.user.userId && req.body.role && req.body.role !== 'administrador') {
    return res.status(409).json({ message: 'No puedes cambiar tu propio rol de administrador.' });
  }

  try {
    const data = await userService.updateUser(req.params.userId, req.body);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el usuario solicitado.' });
    }

    return res.status(200).json({ message: 'Usuario actualizado.', data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }
    if (error.code === 'LAST_ADMIN') {
      return res.status(409).json({ message: error.message });
    }

    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  if (req.params.userId === req.user.userId) {
    return res.status(409).json({ message: 'No puedes eliminar tu propia cuenta.' });
  }

  try {
    const data = await userService.deleteUser(req.params.userId);
    if (!data) {
      return res.status(404).json({ message: 'No se encontró el usuario solicitado.' });
    }

    return res.status(200).json({ message: 'Usuario eliminado.', data });
  } catch (error) {
    if (error.code === 'LAST_ADMIN') {
      return res.status(409).json({ message: error.message });
    }

    return next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};