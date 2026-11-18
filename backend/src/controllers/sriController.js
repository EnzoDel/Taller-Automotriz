const sriService = require('../services/sriService');

const getConfigurationStatus = async (req, res, next) => {
  try {
    const data = await sriService.getConfigurationStatus();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getConfigurationStatus
};
