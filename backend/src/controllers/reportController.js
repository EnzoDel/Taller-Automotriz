const reportService = require('../services/reportService');

const currentYear = () => new Date().getFullYear();

const getMonthlyBilling = async (req, res, next) => {
  try {
    const data = await reportService.getMonthlyBilling(req.query.year ?? currentYear());
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getAnnualBilling = async (req, res, next) => {
  try {
    const toYear = req.query.toYear ?? currentYear();
    const fromYear = req.query.fromYear ?? toYear - 4;
    const data = await reportService.getAnnualBilling(fromYear, toYear);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getMonthlyPurchases = async (req, res, next) => {
  try {
    const data = await reportService.getMonthlyPurchases(req.query.year ?? currentYear());
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

const getAnnualPurchases = async (req, res, next) => {
  try {
    const toYear = req.query.toYear ?? currentYear();
    const fromYear = req.query.fromYear ?? toYear - 4;
    const data = await reportService.getAnnualPurchases(fromYear, toYear);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMonthlyBilling,
  getAnnualBilling,
  getMonthlyPurchases,
  getAnnualPurchases
};
