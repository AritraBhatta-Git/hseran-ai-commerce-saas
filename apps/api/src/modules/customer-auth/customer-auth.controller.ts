import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/dto/logout.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UseGuards, Req } from '@nestjs/common';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';

@Controller('v1/auth/customer')
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}

  @Post('signup')
  signup(@Body() dto: CustomerSignupDto) {
    return this.service.signup(dto);
  }

  /**
   * POST - for API calls (mobile/SPA)
   */
  @Post('verify-email')
  verifyEmailPost(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto);
  }

  /**
   * GET - for email link clicks → verify then redirect to storefront success page
   */
  @Get('verify-email')
  async verifyEmailGet(@Query('token') token: string, @Res() res: Response) {
    const STOREFRONT = process.env.STOREFRONT_URL || 'http://localhost:3000';
    try {
      await this.service.verifyEmail({ token });
      return res.redirect(`${STOREFRONT}/auth/verify-email/success`);
    } catch {
      return res.redirect(`${STOREFRONT}/auth/verify-email/expired`);
    }
  }

  @Post('login')
  login(@Body() dto: CustomerLoginDto) {
    return this.service.login(dto);
  }

  @Post('google-login')
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.service.googleLogin(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.service.resendVerification(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.service.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.service.logout(dto.refreshToken);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('logout-all')
  logoutAll(@Req() req: any) {
    return this.service.logoutAll(req.user.sub);
  }
}