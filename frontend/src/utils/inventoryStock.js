export const getStockLevel = (stock, stockMax) => {
  const currentStock = Number(stock);
  const maximumStock = Number(stockMax);

  if (!Number.isFinite(currentStock) || !Number.isInteger(maximumStock) || maximumStock <= 0) {
    return 'unconfigured';
  }

  const percentage = currentStock / maximumStock;
  if (percentage <= 0.25) {
    return 'red';
  }
  if (percentage <= 0.5) {
    return 'yellow';
  }
  return 'green';
};
