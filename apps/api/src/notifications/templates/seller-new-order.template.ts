export const sellerNewOrderTemplate = (order: any) => {
  const itemsHtml = order.items
    ?.map(
      (item) => `
      <li>${item.productName} × ${item.quantity}</li>
    `,
    )
    .join('');

  return `
  <div style="font-family: Arial; padding:20px;">
    <h2 style="color:#FF9800;">New Order Received 🛒</h2>

    <p>You have received a new order.</p>

    <p><b>Order ID:</b> ${order.id}</p>

    <p><b>Total:</b> ₹${order.totalAmount}</p>

    <h3>Items:</h3>
    <ul>
      ${itemsHtml}
    </ul>
  </div>
  `;
};