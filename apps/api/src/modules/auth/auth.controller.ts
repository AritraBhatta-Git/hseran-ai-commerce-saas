import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import { SellerSendOtpDto } from './dto/seller-send-otp.dto';
import { SellerVerifyOtpDto } from './dto/seller-verify-otp.dto';
import { SellerSignupDto } from './dto/seller-signup.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SellerAddEmailDto } from './dto/seller-add-email.dto';
import { SellerVerifyEmailOtpDto } from './dto/seller-verify-email-otp.dto';
import { SellerGoogleLoginDto } from './dto/seller-google-login.dto';

import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // =====================================================
  // SELLER SIGNUP
  // =====================================================

  @Post('seller/signup')
  sellerSignup(@Body() dto: SellerSignupDto) {
    return this.authService.sellerSignup(dto.name, dto.phone);
  }

  // =====================================================
  // SELLER OTP FLOW
  // =====================================================

  @Post('seller/send-otp')
  sellerSendOtp(@Body() dto: SellerSendOtpDto) {
    return this.authService.sellerSendOtp(dto.phone);
  }

  @Post('seller/resend-otp')
  sellerResendOtp(@Body() dto: SellerSendOtpDto) {
    return this.authService.sellerResendOtp(dto.phone);
  }

  @Post('seller/verify-otp')
  sellerVerifyOtp(@Body() dto: SellerVerifyOtpDto) {
    return this.authService.sellerVerifyOtp(dto.phone, dto.otp);
  }

  // =====================================================
  // TOKEN MANAGEMENT
  // =====================================================

  @Post('seller/refresh-token')
  sellerRefresh(@Body() dto: RefreshTokenDto) {
    return this.authService.sellerRefreshToken(dto.refreshToken);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  @Post('seller/logout')
  sellerLogout(@Body() dto: LogoutDto) {
    return this.authService.sellerLogout(dto.refreshToken);
  }

  @UseGuards(SellerJwtGuard)
  @Post('seller/logout-all')
  sellerLogoutAll(@Req() req: any) {
    return this.authService.sellerLogoutAll(req.user.sellerId);
  }

  // =====================================================
  // SELLER EMAIL MANAGEMENT (requires auth)
  // =====================================================

  @UseGuards(SellerJwtGuard)
  @Post('seller/add-email')
  sellerAddEmail(@Req() req: any, @Body() dto: SellerAddEmailDto) {
    return this.authService.sellerAddOrUpdateEmail(req.user.sellerId, dto.email);
  }

  @UseGuards(SellerJwtGuard)
  @Post('seller/resend-email-otp')
  sellerResendEmailOtp(@Req() req: any, @Body() dto: SellerAddEmailDto) {
    return this.authService.sellerSendEmailVerificationOtp(req.user.sellerId, dto.email);
  }

  @UseGuards(SellerJwtGuard)
  @Post('seller/verify-email-otp')
  sellerVerifyEmailOtp(@Req() req: any, @Body() dto: SellerVerifyEmailOtpDto) {
    return this.authService.sellerVerifyEmailOtp(req.user.sellerId, dto.email, dto.otp);
  }

  // =====================================================
  // SELLER GOOGLE LOGIN & ACCOUNT LINKING
  // =====================================================

  @Post('seller/google-login')
  sellerGoogleLogin(@Body() dto: SellerGoogleLoginDto) {
    return this.authService.sellerGoogleLogin(dto.googleId, dto.email, dto.name);
  }
}