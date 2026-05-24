export const orderConfirmationTemplate = (order: any): string => {
  const customer = order.customer || {};
  const store = order.store || {};
  const items: any[] = order.items || [];

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:16px; border-bottom:1px solid rgba(94,133,72,0.12); vertical-align:middle;">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:52px; height:52px; border-radius:10px; background:linear-gradient(135deg,#1e2e1a,#162013); border:1px solid rgba(94,133,72,0.2); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:22px;">📦</div>
          <div>
            <div style="font-weight:700; color:#e8ede6; font-size:14px; margin-bottom:3px;">${item.productName}</div>
            <div style="color:#7a8c73; font-size:12px;">Qty: ${item.quantity} &nbsp;·&nbsp; Unit price: ₹${Number(item.price).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </td>
      <td style="padding:16px; border-bottom:1px solid rgba(94,133,72,0.12); text-align:right; font-weight:800; color:#7ea265; font-size:15px; white-space:nowrap; vertical-align:middle;">
        ₹${(item.price * item.quantity).toLocaleString('en-IN')}
      </td>
    </tr>`,
    )
    .join('');

  const orderedAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

  const statusSteps = [
    { label: 'Order Placed', icon: '✅', done: true },
    { label: 'Confirmed', icon: '📋', done: false },
    { label: 'Shipped', icon: '🚚', done: false },
    { label: 'Delivered', icon: '🏠', done: false },
  ];

  const timelineHtml = statusSteps
    .map(
      (step, idx) => `
    <td style="text-align:center; width:25%; padding:0 4px;">
      <div style="display:inline-flex; flex-direction:column; align-items:center; gap:6px;">
        <div style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; line-height:40px;
          background:${step.done ? 'linear-gradient(135deg,#5e8548,#4a6b37)' : 'rgba(94,133,72,0.08)'};
          border:2px solid ${step.done ? '#5e8548' : 'rgba(94,133,72,0.2)'};
          box-shadow:${step.done ? '0 4px 14px rgba(94,133,72,0.35)' : 'none'};
          ">${step.icon}</div>
        <div style="font-size:11px; font-weight:${step.done ? '700' : '500'}; color:${step.done ? '#a8c192' : '#7a8c73'}; white-space:nowrap;">${step.label}</div>
        ${idx < statusSteps.length - 1 ? '' : ''}
      </div>
    </td>`,
    )
    .join(`<td style="padding:0; vertical-align:middle;"><div style="height:2px; background:linear-gradient(90deg,#5e8548,rgba(94,133,72,0.2)); margin-bottom:20px;"></div></td>`);

  const shippingAddr = order.shippingAddress
    ? `${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}, ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pin}`
    : null;

  const storefront = process.env.STOREFRONT_URL || 'https://hseran.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmed – HSERAN</title>
</head>
<body style="margin:0; padding:0; background:#0a120a; font-family:'Segoe UI',Arial,sans-serif; -webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a120a; padding:48px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px; width:100%;">

        <!-- ══ HEADER ══════════════════════════════════════════ -->
        <tr><td style="
          background:linear-gradient(135deg,#162013 0%,#0f1a0d 100%);
          border-radius:20px 20px 0 0;
          padding:32px 40px 28px;
          text-align:center;
          border-bottom:1px solid rgba(94,133,72,0.15);
        ">
          <div style="font-size:32px; font-weight:900; letter-spacing:-1px; color:#7ea265; margin-bottom:4px;">
            HSERAN
          </div>
          <div style="font-size:11px; color:#4a6b37; letter-spacing:4px; text-transform:uppercase;">
            Conscious Commerce · India
          </div>
        </td></tr>

        <!-- ══ HERO ══════════════════════════════════════════════ -->
        <tr><td style="
          background:linear-gradient(180deg,#111f11 0%,#0e1a0e 100%);
          padding:48px 40px 40px;
          text-align:center;
          border-bottom:1px solid rgba(94,133,72,0.1);
          position:relative;
          overflow:hidden;
        ">
          <div style="
            width:80px; height:80px; border-radius:50%; margin:0 auto 20px;
            background:linear-gradient(135deg,#5e8548,#3b542d);
            display:flex; align-items:center; justify-content:center;
            font-size:36px; line-height:80px;
            box-shadow:0 0 40px rgba(94,133,72,0.4);
          ">✅</div>
          <h1 style="margin:0 0 12px; font-size:30px; font-weight:900; color:#e8ede6; letter-spacing:-0.5px;">
            Order Confirmed!
          </h1>
          <p style="margin:0; color:#7a8c73; font-size:15px; line-height:1.7; max-width:400px; margin:0 auto;">
            Hey <strong style="color:#a8c192;">${customer.name || 'there'}</strong> 👋 — your order has been placed
            successfully. We'll keep you updated every step of the way. 🌿
          </p>
        </td></tr>

        <!-- ══ ORDER META ═════════════════════════════════════════ -->
        <tr><td style="background:#0f1a0f; padding:28px 40px; border-bottom:1px solid rgba(94,133,72,0.1);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:48%; padding-right:8px; vertical-align:top;">
                <div style="background:rgba(94,133,72,0.05); border:1px solid rgba(94,133,72,0.15); border-radius:14px; padding:18px;">
                  <div style="font-size:10px; color:#4a6b37; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; font-weight:600;">Order ID</div>
                  <div style="font-size:14px; font-weight:800; color:#7ea265; word-break:break-all; font-family:monospace;">#${order.id ? order.id.slice(0, 18) + '...' : 'N/A'}</div>
                </div>
              </td>
              <td style="width:48%; padding-left:8px; vertical-align:top;">
                <div style="background:rgba(94,133,72,0.05); border:1px solid rgba(94,133,72,0.15); border-radius:14px; padding:18px;">
                  <div style="font-size:10px; color:#4a6b37; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; font-weight:600;">Ordered On</div>
                  <div style="font-size:13px; font-weight:700; color:#e8ede6;">${orderedAt}</div>
                </div>
              </td>
            </tr>
            ${
              store.name
                ? `<tr><td colspan="2" style="padding-top:12px;">
              <div style="background:rgba(94,133,72,0.05); border:1px solid rgba(94,133,72,0.15); border-radius:14px; padding:18px; display:flex; align-items:center; gap:12px;">
                <span style="font-size:22px;">🏪</span>
                <div>
                  <div style="font-size:10px; color:#4a6b37; text-transform:uppercase; letter-spacing:2px; margin-bottom:4px; font-weight:600;">Fulfilled By</div>
                  <div style="font-size:14px; font-weight:700; color:#e8ede6;">${store.name}</div>
                </div>
              </div>
            </td></tr>`
                : ''
            }
            ${
              shippingAddr
                ? `<tr><td colspan="2" style="padding-top:12px;">
              <div style="background:rgba(94,133,72,0.05); border:1px solid rgba(94,133,72,0.15); border-radius:14px; padding:18px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="font-size:16px;">📍</span>
                  <div style="font-size:10px; color:#4a6b37; text-transform:uppercase; letter-spacing:2px; font-weight:600;">Shipping To</div>
                </div>
                <div style="font-size:13px; color:#b5c4ae; line-height:1.6;">${shippingAddr}</div>
              </div>
            </td></tr>`
                : ''
            }
          </table>
        </td></tr>

        <!-- ══ ORDER TIMELINE ════════════════════════════════════ -->
        <tr><td style="background:#111f11; padding:28px 40px; border-bottom:1px solid rgba(94,133,72,0.1);">
          <h3 style="margin:0 0 20px; font-size:12px; font-weight:700; color:#4a6b37; text-transform:uppercase; letter-spacing:2.5px;">Order Status</h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>${timelineHtml}</tr>
          </table>
        </td></tr>

        <!-- ══ ORDER ITEMS ═══════════════════════════════════════ -->
        <tr><td style="background:#0f1a0f; padding:28px 40px; border-bottom:1px solid rgba(94,133,72,0.1);">
          <h3 style="margin:0 0 16px; font-size:12px; font-weight:700; color:#4a6b37; text-transform:uppercase; letter-spacing:2.5px;">Order Summary</h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
            border:1px solid rgba(94,133,72,0.15);
            border-radius:14px;
            overflow:hidden;
          ">
            <tr style="background:rgba(94,133,72,0.08);">
              <th style="padding:12px 16px; text-align:left; font-size:11px; color:#4a6b37; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">Product</th>
              <th style="padding:12px 16px; text-align:right; font-size:11px; color:#4a6b37; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">Amount</th>
            </tr>
            ${itemsHtml}
            <!-- Subtotal Row -->
            <tr style="background:rgba(94,133,72,0.04);">
              <td style="padding:12px 16px; font-size:13px; color:#7a8c73;">Subtotal</td>
              <td style="padding:12px 16px; text-align:right; font-size:13px; color:#b5c4ae; font-weight:600;">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:rgba(94,133,72,0.04);">
              <td style="padding:12px 16px; font-size:13px; color:#7a8c73;">Delivery</td>
              <td style="padding:12px 16px; text-align:right; font-size:13px; color:#4ade80; font-weight:700;">FREE</td>
            </tr>
            <!-- Total Row -->
            <tr style="background:rgba(94,133,72,0.12); border-top:1px solid rgba(94,133,72,0.2);">
              <td style="padding:18px 16px; font-size:16px; font-weight:900; color:#e8ede6;">Total Paid</td>
              <td style="padding:18px 16px; text-align:right; font-size:22px; font-weight:900; color:#7ea265;">
                ₹${(order.totalAmount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- ══ PAYMENT METHOD ════════════════════════════════════ -->
        ${
          order.paymentMethod
            ? `<tr><td style="background:#0f1a0f; padding:0 40px 20px; border-bottom:1px solid rgba(94,133,72,0.1);">
          <div style="background:rgba(94,133,72,0.04); border:1px solid rgba(94,133,72,0.12); border-radius:12px; padding:14px 18px; display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">💳</span>
            <div>
              <div style="font-size:10px; color:#4a6b37; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">Payment Via</div>
              <div style="font-size:13px; font-weight:700; color:#b5c4ae; margin-top:3px;">${order.paymentMethod}</div>
            </div>
          </div>
        </td></tr>`
            : ''
        }

        <!-- ══ CTA ════════════════════════════════════════════════ -->
        <tr><td style="background:#111f11; padding:36px 40px; text-align:center; border-bottom:1px solid rgba(94,133,72,0.1);">
          <p style="margin:0 0 22px; color:#7a8c73; font-size:14px; line-height:1.7;">
            Track your shipment and manage your order in real-time from your account dashboard.
          </p>
          <a href="${storefront}/customer/dashboard"
            style="
              display:inline-block;
              background:linear-gradient(135deg,#5e8548,#4a6b37);
              color:#ffffff;
              text-decoration:none;
              font-weight:800;
              font-size:15px;
              padding:16px 44px;
              border-radius:50px;
              letter-spacing:0.5px;
              box-shadow:0 8px 30px rgba(94,133,72,0.4);
            ">
            📦 Track My Order →
          </a>
          <div style="margin-top:20px; display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
            <a href="${storefront}/products" style="color:#4a6b37; font-size:12px; text-decoration:none; font-weight:600;">Shop More</a>
            <span style="color:#2a3d25;">·</span>
            <a href="${storefront}/customer/dashboard" style="color:#4a6b37; font-size:12px; text-decoration:none; font-weight:600;">My Account</a>
            <span style="color:#2a3d25;">·</span>
            <a href="${storefront}" style="color:#4a6b37; font-size:12px; text-decoration:none; font-weight:600;">Home</a>
          </div>
        </td></tr>

        <!-- ══ HELP BOX ═══════════════════════════════════════════ -->
        <tr><td style="background:#0a120a; padding:28px 40px; border-bottom:1px solid rgba(94,133,72,0.08);">
          <div style="background:rgba(94,133,72,0.04); border:1px solid rgba(94,133,72,0.1); border-radius:14px; padding:20px 24px; text-align:center;">
            <div style="font-size:20px; margin-bottom:8px;">💬</div>
            <div style="font-size:13px; font-weight:700; color:#b5c4ae; margin-bottom:4px;">Need help with this order?</div>
            <div style="font-size:12px; color:#7a8c73; line-height:1.6;">
              Reply to this email or visit your dashboard to contact the seller directly.
            </div>
          </div>
        </td></tr>

        <!-- ══ FOOTER ═════════════════════════════════════════════ -->
        <tr><td style="
          background:#080e08;
          border-radius:0 0 20px 20px;
          padding:28px 40px;
          text-align:center;
          border-top:1px solid rgba(94,133,72,0.08);
        ">
          <div style="font-size:22px; font-weight:900; color:#2a3d25; letter-spacing:-0.5px; margin-bottom:8px;">HSERAN</div>
          <p style="margin:0 0 6px; color:#2a3d25; font-size:11px; line-height:1.6;">
            This email was sent to <strong>${customer.email || ''}</strong> because you placed an order on HSERAN.
          </p>
          <p style="margin:0; color:#1e2e1a; font-size:10px;">
            © 2026 HSERAN · Conscious Commerce · All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
};