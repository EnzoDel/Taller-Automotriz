const historyService = require('../services/historyService');

const getHistory = async (req, res, next) => {
  try {
    const result = await historyService.getHistory({
      searchTerm: req.query.q,
      fromDate: req.query.from,
      toDate: req.query.to,
      page: req.query.page,
      limit: req.query.limit
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHistory
};