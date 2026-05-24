import * as nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional (for debugging)
export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP Server is ready');
  } catch (err) {
    console.error('❌ SMTP Connection failed:', err);
  }
};