import { Injectable } from '@nestjs/common';
import { transporter } from '../utils/mailer.util';

@Injectable()
export class EmailService {
  async sendMail(to: string, subject: string, html: string) {
    console.log('🔥 EmailService.sendMail CALLED');

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const info = await transporter.sendMail({
          from: `"HSERAN" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });

        console.log('📧 Email sent:', info.messageId);
        return;
      } catch (error) {
        console.error(`❌ Email attempt ${attempt + 1} failed`);

        if (attempt === 1) {
          console.error('❌ Final email failure:', error);
        }
      }
    }
  }
}