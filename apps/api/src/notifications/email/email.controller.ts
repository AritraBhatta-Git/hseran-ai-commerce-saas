import { Controller, Get } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('test')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Get('email')
  async sendTestEmail() {
    await this.emailService.sendMail(
      'aritrabhattacharya269@gmail.com',
      'HSERAN Email Test',
      '<h1>HSERAN Email System Works 🚀</h1>',
    );

    return { message: 'Test email sent' };
  }
}