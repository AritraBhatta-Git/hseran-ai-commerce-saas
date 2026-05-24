export const isLowStock = (stockQty: number, threshold = 5) => {
  return stockQty <= threshold;
};