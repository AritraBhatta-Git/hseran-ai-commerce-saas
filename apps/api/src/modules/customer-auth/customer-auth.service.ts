import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OtpPurpose, UserRole } from '@prisma/client';
import { randomInt } from 'crypto';
import * as crypto from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../../notifications/email/email.service';

@Injectable()
export class CustomerAuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  // ========================
  // SIGNUP
  // ========================
  async signup(dto: CustomerSignupDto) {
    const existing = await this.db.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const customer = await this.db.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hash,
      },
    });

    const token = crypto.randomUUID();

    await this.db.prisma.emailVerification.create({
      data: {
        customerId: customer.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    const verifyUrl = `${API_BASE}/v1/auth/customer/verify-email?token=${token}`;

    console.log('🔥 EMAIL FUNCTION TRIGGERED');

    await this.emailService.sendMail(
      dto.email,
      'Welcome to HSERAN India',
      `
      <h2>Verify your HSERAN account</h2>
      <p>Click below to verify your email</p>
      <a href="${verifyUrl}">Verify Email</a>
      `,
    );

    return {
      message: 'Signup successful. Please verify your email.',
    };
  }

  // ========================
  // FORGOT PASSWORD
  // ========================
  async forgotPassword(dto: ForgotPasswordDto) {
    const customer = await this.db.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer) {
      return { message: 'If this email exists, a reset link was sent' };
    }

    const token = crypto.randomUUID();

    await this.db.prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const STOREFRONT = process.env.STOREFRONT_URL || 'http://localhost:3000';
    const resetUrl = `${STOREFRONT}/auth/reset-password?token=${token}`;


    await this.emailService.sendMail(
      dto.email,
      'Reset your HSERAN password',
      `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password</p>
      <a href="${resetUrl}">Reset Password</a>
      `,
    );

    console.log('PASSWORD RESET TOKEN:', token);

    return {
      message: 'Password reset link sent',
    };
  }

  // ========================
  // OPTIONAL OTP (kept existing)
  // ========================
  async sendEmailOtp(email: string) {
    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.db.prisma.otpRequest.create({
      data: {
        phone: email,
        purpose: OtpPurpose.CUSTOMER_VERIFY_EMAIL,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log('Email OTP:', otp);
  }

  // ========================
  // VERIFY EMAIL (TOKEN)
  // ========================
  async verifyEmail(dto: VerifyEmailDto) {
    const record = await this.db.prisma.emailVerification.findFirst({
      where: {
        token: dto.token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.db.prisma.customer.update({
      where: { id: record.customerId },
      data: { emailVerified: true },
    });

    await this.db.prisma.emailVerification.delete({
      where: { id: record.id },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  // ========================
  // RESEND VERIFICATION
  // ========================
  async resendVerification(email: string) {
    const customer = await this.db.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const token = crypto.randomUUID();

    await this.db.prisma.emailVerification.create({
      data: {
        customerId: customer.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    const verifyUrl = `${API_BASE}/v1/auth/customer/verify-email?token=${token}`;

    await this.emailService.sendMail(
      email,
      'Verify your HSERAN account',
      `
      <h2>Verify your HSERAN account</h2>
      <p>Click below to verify your email</p>
      <a href="${verifyUrl}">Verify Email</a>
      `,
    );

    console.log('NEW EMAIL VERIFICATION TOKEN:', token);

    return {
      message: 'Verification email resent',
    };
  }

  // ========================
  // LOGIN
  // ========================
  async login(dto: CustomerLoginDto) {
    const customer = await this.db.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google login. Please sign in with Google.',
      );
    }

    const match = await bcrypt.compare(dto.password, customer.passwordHash);

    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    const payload = {
      sub: customer.id,
      role: UserRole.CUSTOMER,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.db.prisma.authSession.create({
      data: {
        role: UserRole.CUSTOMER,
        customerId: customer.id,
        refreshTokenHash: refreshHash,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // ========================
  // GOOGLE LOGIN & ACCOUNT LINKING
  // ========================
  async googleLogin(dto: import('./dto/google-login.dto').GoogleLoginDto) {
    let isNewCustomer = false;

    let customer = await this.db.prisma.customer.findFirst({
      where: {
        OR: [
          { googleId: dto.googleId },
          { email: dto.email }
        ]
      }
    });

    if (customer) {
      if (!customer.googleId) {
        // Account linking: existing email account → link Google
        customer = await this.db.prisma.customer.update({
          where: { id: customer.id },
          data: {
            googleId: dto.googleId,
            emailVerified: true,
          }
        });
      }
    } else {
      // Brand new customer via Google
      isNewCustomer = true;
      customer = await this.db.prisma.customer.create({
        data: {
          name: dto.name,
          email: dto.email,
          googleId: dto.googleId,
          emailVerified: true,
        }
      });
    }

    const payload = { sub: customer.id, role: UserRole.CUSTOMER };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwt.signAsync(payload, { expiresIn: '7d' });
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.db.prisma.authSession.create({
      data: {
        role: UserRole.CUSTOMER,
        customerId: customer.id,
        refreshTokenHash: refreshHash,
      },
    });

    // Send beautiful welcome email on first Google signup
    if (isNewCustomer) {
      const STOREFRONT = process.env.STOREFRONT_URL || 'http://localhost:3001';
      try {
        await this.emailService.sendMail(
          customer.email,
          `Welcome to HSERAN, ${customer.name}! 🛍️`,
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to HSERAN</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #fff; }
  </style>
</head>
<body style="background: #0f0f1a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #13132a 0%, #1a1030 100%); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">

    <!-- Hero -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0ea5e9 100%); padding: 48px 40px; text-align: center; position: relative;">
      <div style="font-size: 48px; margin-bottom: 12px;">🛍️</div>
      <h1 style="font-size: 36px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 8px;">Welcome to HSERAN!</h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 16px;">India's smartest multi-store shopping platform</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px;">
      <p style="color: rgba(255,255,255,0.85); font-size: 16px; line-height: 1.7; margin-bottom: 28px;">
        Hey <strong style="color: #a78bfa;">${customer.name}</strong> 👋<br /><br />
        You've just joined thousands of smart shoppers on HSERAN — India's multi-store marketplace where independent sellers bring their best products straight to you.
      </p>

      <!-- Feature Pills -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px;">
        ${[
          ['🏪', 'Browse Stores', 'Discover unique sellers and their collections'],
          ['⚡', 'Fast Checkout', 'One-click ordering from any store'],
          ['📦', 'Live Tracking', 'Real-time order updates from seller'],
          ['🔐', 'Secure Pay', 'Protected by bank-grade security'],
        ].map(([icon, title, desc]) => `
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; text-align: center;">
            <div style="font-size: 28px; margin-bottom: 8px;">${icon}</div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 14px; margin-bottom: 4px;">${title}</div>
            <div style="color: rgba(255,255,255,0.45); font-size: 12px; line-height: 1.5;">${desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${STOREFRONT}/products"
          style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; padding: 16px 44px; border-radius: 50px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 8px 32px rgba(124,58,237,0.5);">
          Start Shopping →
        </a>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${STOREFRONT}/products" style="color: rgba(255,255,255,0.3); font-size: 12px; text-decoration: none;">Browse Products</a>
        &nbsp;·&nbsp;
        <a href="${STOREFRONT}/auth/login" style="color: rgba(255,255,255,0.3); font-size: 12px; text-decoration: none;">Sign In</a>
        &nbsp;·&nbsp;
        <a href="${STOREFRONT}" style="color: rgba(255,255,255,0.3); font-size: 12px; text-decoration: none;">Home</a>
      </div>

      <p style="color: rgba(255,255,255,0.25); font-size: 11px; text-align: center; line-height: 1.6;">
        You signed up with Google.<br />
        This email was sent to ${customer.email}. If you didn't sign up, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`,
        );
      } catch (e) {
        console.error('Welcome email failed (non-blocking):', e);
      }
    }

    return {
      accessToken,
      refreshToken,
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      message: isNewCustomer ? 'Account created with Google!' : 'Logged in with Google successfully',
    };
  }


  // ========================
  // RESET PASSWORD
  // ========================
  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.db.prisma.passwordResetToken.findFirst({
      where: {
        token: dto.token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);

    await this.db.prisma.customer.update({
      where: { id: record.customerId },
      data: { passwordHash: hash },
    });

    await this.db.prisma.passwordResetToken.delete({
      where: { id: record.id },
    });

    return {
      message: 'Password reset successful',
    };
  }

  // ========================
  // LOGOUT
  // ========================
  async logout(refreshToken: string) {
    const sessions = await this.db.prisma.authSession.findMany({
      where: { role: UserRole.CUSTOMER },
    });

    for (const session of sessions) {
      const match = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (match) {
        await this.db.prisma.authSession.delete({
          where: { id: session.id },
        });

        return { message: 'Logged out successfully' };
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  // ========================
  // LOGOUT ALL
  // ========================
  async logoutAll(customerId: string) {
    await this.db.prisma.authSession.deleteMany({
      where: {
        role: UserRole.CUSTOMER,
        customerId,
      },
    });

    return {
      message: 'Logged out from all devices',
    };
  }
}