import PDFDocument from 'pdfkit';

export function generateInvoicePdf(order: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers: any[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // 🧾 HEADER
    doc.fontSize(20).text('HSERAN INVOICE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${order.id}`);
    doc.text(`Date: ${new Date(order.createdAt).toDateString()}`);
    doc.moveDown();

    // 👤 CUSTOMER
    doc.text(`Customer: ${order.customer?.name}`);
    doc.text(`Email: ${order.customer?.email}`);
    doc.moveDown();

    // 🏬 STORE
    doc.text(`Store: ${order.store?.name}`);
    doc.moveDown();

    // 📦 ITEMS
    doc.text('Items:', { underline: true });
    doc.moveDown(0.5);

    order.items.forEach((item: any) => {
      doc.text(
        `${item.productName} - ₹${item.price} x ${item.quantity}`,
      );
    });

    doc.moveDown();

    // 💰 TOTAL
    doc.fontSize(14).text(`Total: ₹${order.totalAmount}`, {
      align: 'right',
    });

    doc.end();
  });
}