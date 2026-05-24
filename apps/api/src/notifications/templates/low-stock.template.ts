export const lowStockTemplate = (product: any) => {
  return `
  <div style="font-family: Arial; padding:20px;">
    <h2 style="color:#f44336;">⚠️ Low Stock Alert</h2>

    <p>Your product is running low on stock:</p>

    <p><b>${product.name}</b></p>
    <p>Current Stock: <b>${product.stockQty}</b></p>

    <p>Please restock soon to avoid losing sales.</p>
  </div>
  `;
};