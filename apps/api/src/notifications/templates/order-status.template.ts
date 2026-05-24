export const orderStatusTemplate = (order: any, status: string) => {
  return `
  <div style="font-family: Arial; padding:20px;">
    <h2 style="color:#2196F3;">Order Update 📦</h2>

    <p>Hi ${order.customer?.name || 'Customer'},</p>

    <p>Your order <b>${order.id}</b> is now:</p>

    <h3 style="color:#4CAF50;">${status}</h3>

    <p>Track your order for more updates.</p>
  </div>
  `;
};