import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../providers/prisma/prisma.service';
import { RedisService } from '../../providers/redis/redis.service';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
} from '../../common/utils/otp.util';
import { randomSuffix, slugify } from '../../common/utils/slug.util';
import { RateLimitService } from '../../common/services/rate-limit.service';
import * as crypto from 'crypto';
import { EmailService } from '../../notifications/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private rateLimitService: RateLimitService,
    private emailService: EmailService,
  ) {}




  // =====================================================
  // OTP SECURITY RULES
  // =====================================================

  private async enforceOtpRateLimit(phone: string) {
    const key = `otp:rate:${phone}`;
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, 60 * 60);
    }

    if (count > 5) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait before trying again.',
      );
    }
  }

  private async enforceResendCooldown(phone: string) {
    const key = `otp:cooldown:${phone}`;

    if (await this.redis.client.get(key)) {
      throw new BadRequestException(
        'Please wait 30 seconds before resending OTP.',
      );
    }

    await this.redis.client.set(key, '1', 'EX', 30);
  }

  private async enforceResendLimit(phone: string) {
    const key = `otp:resend:${phone}`;
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, 10 * 60);
    }

    if (count > 2) {
      throw new BadRequestException(
        'Resend limit reached. Please try again later.',
      );
    }
  }

  // =====================================================
  // SELLER SIGNUP
  // =====================================================

  async sellerSignup(name: string, phone: string) {
    const existing = await this.db.prisma.seller.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new BadRequestException(
        'Account already exists. Please login instead.',
      );
    }

    const seller = await this.db.prisma.seller.create({
      data: {
        name,
        phone,
      },
    });

    await this.sellerSendOtp(phone);

    return {
      message: 'Seller account created. OTP sent for verification.',
      seller: {
        id: seller.id,
        name: seller.name,
        phone: seller.phone,
      },
    };
  }
  

  // =====================================================
// CUSTOMER SIGNUP
// =====================================================

async customerSignup(name: string, email: string, password: string) {

  const existing = await this.db.prisma.customer.findUnique({
    where: { email },
  });

  if (existing) {
    throw new BadRequestException('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const customer = await this.db.prisma.customer.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  // EMAIL VERIFICATION TOKEN
  const token = crypto.randomUUID();

  await this.db.prisma.emailVerification.create({
    data: {
      customerId: customer.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
  });

  
  return {
    message: 'Customer created. Please verify your email.',
  };
}


  // =====================================================
  // OTP FLOW
  // =====================================================

  async sellerSendOtp(phone: string) {
    await this.enforceOtpRateLimit(phone);

    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp);

    const expiresAt = new Date(
      Date.now() + Number(process.env.OTP_EXPIRY_SECONDS || 300) * 1000,
    );

    await this.db.prisma.otpRequest.create({
      data: {
        phone,
        purpose: 'SELLER_LOGIN',
        otpHash,
        expiresAt,
      },
    });

    return {
      message: 'OTP generated successfully (DEV MODE)',
      phone,
      otp,
      expiresAt,
    };
  }

  async sellerResendOtp(phone: string) {
    await this.enforceResendCooldown(phone);
    await this.enforceResendLimit(phone);

    return this.sellerSendOtp(phone);
  }

  async sellerVerifyOtp(phone: string, otp: string) {
    await this.checkOtpBlocked(phone);

    const latestOtp = await this.db.prisma.otpRequest.findFirst({
      where: { phone, usedAt: null, purpose: 'SELLER_LOGIN' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) throw new BadRequestException('OTP not found.');

    if (latestOtp.expiresAt.getTime() < Date.now())
      throw new BadRequestException('OTP expired.');

    const isValid = await verifyOtpHash(otp, latestOtp.otpHash);

    if (!isValid) {
      await this.recordOtpFailure(phone);
      throw new BadRequestException('Invalid OTP.');
    }

    await this.clearOtpFailures(phone);

    await this.db.prisma.otpRequest.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });

    const seller = await this.db.prisma.seller.findUnique({
      where: { phone },
      include: { stores: true },
    });

    if (!seller) {
      throw new BadRequestException('Seller not found.');
    }

    let store = seller.stores[0] ?? null;

    if (!store) {
      store = await this.db.prisma.store.create({
        data: {
          sellerId: seller.id,
          name: 'My Store',
          slug: `${slugify(`store-${seller.phone}`)}-${randomSuffix(4)}`,
          status: 'TRIAL',
          isPublic: true,
        },
      });
    }

    const accessToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: seller.id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const refreshToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: seller.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    await this.db.prisma.authSession.create({
      data: {
        role: 'SELLER',
        sellerId: seller.id,
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
      },
    });

    return {
      message: 'Seller authenticated successfully',
      seller: {
        id: seller.id,
        name: seller.name,
        phone: seller.phone,
      },
      store,
      accessToken,
      refreshToken,
    };
  }

  // =====================================================
  // OTP BRUTE FORCE PROTECTION
  // =====================================================

  private async recordOtpFailure(phone: string) {
    const key = `otp:fail:${phone}`;
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, 600);
    }

    if (count >= 5) {
      await this.redis.client.set(`otp:block:${phone}`, '1', 'EX', 600);
    }
  }

  private async checkOtpBlocked(phone: string) {
    const blocked = await this.redis.client.get(`otp:block:${phone}`);

    if (blocked) {
      throw new BadRequestException(
        'Too many incorrect OTP attempts. Try again in 10 minutes.',
      );
    }
  }

  private async clearOtpFailures(phone: string) {
    await this.redis.client.del(`otp:fail:${phone}`);
  }


  // =====================================================
// CUSTOMER EMAIL VERIFICATION
// =====================================================

async verifyCustomerEmail(token: string) {
  const record = await this.db.prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!record) {
    throw new BadRequestException('Invalid verification token');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException('Verification token expired');
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

  // =====================================================
  // TOKEN ROTATION
  // =====================================================

  async sellerRefreshToken(refreshToken: string) {
    const sessions = await this.db.prisma.authSession.findMany({
      where: { role: 'SELLER' },
    });

    let matched: (typeof sessions)[number] | null = null;

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        matched = session;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = await this.jwt.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const newAccessToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: payload.sellerId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const newRefreshToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: payload.sellerId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    await this.db.prisma.authSession.update({
      where: { id: matched.id },
      data: {
        refreshTokenHash: await bcrypt.hash(newRefreshToken, 10),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async sellerLogout(refreshToken: string) {
    const sessions = await this.db.prisma.authSession.findMany({
      where: { role: 'SELLER' },
    });

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        await this.db.prisma.authSession.delete({ where: { id: session.id } });
        return { message: 'Logged out successfully' };
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async sellerLogoutAll(sellerId: string) {
    await this.db.prisma.authSession.deleteMany({
      where: { role: 'SELLER', sellerId },
    });

    return { message: 'Logged out from all devices' };
  }

  // =====================================================
  // SELLER EMAIL ADD / UPDATE
  // =====================================================

  async sellerAddOrUpdateEmail(sellerId: string, email: string) {
    const exists = await this.db.prisma.seller.findFirst({
      where: { email, NOT: { id: sellerId } },
    });

    if (exists) {
      throw new BadRequestException('This email is already used by another account.');
    }

    await this.db.prisma.seller.update({
      where: { id: sellerId },
      data: { email, emailVerified: false },
    });

    // Send verification OTP
    return this.sellerSendEmailVerificationOtp(sellerId, email);
  }

  // =====================================================
  // SELLER EMAIL VERIFICATION VIA SMTP OTP
  // =====================================================

  async sellerSendEmailVerificationOtp(sellerId: string, email: string) {
    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.db.prisma.otpRequest.create({
      data: {
        sellerId,
        phone: email, // reusing phone field to store email
        purpose: 'SELLER_LOGIN',
        otpHash,
        expiresAt,
      },
    });

    try {
      await this.emailService.sendMail(
        email,
        'Verify your HSERAN seller email',
        `
        <h2>Email Verification</h2>
        <p>Your OTP to verify your seller email is:</p>
        <h1 style="letter-spacing:8px; font-family:monospace;">${otp}</h1>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        `,
      );
    } catch (e) {
      console.error('Failed to send seller email verification OTP', e);
    }

    return { message: 'Verification OTP sent to your email.' };
  }

  async sellerVerifyEmailOtp(sellerId: string, email: string, otp: string) {
    const latest = await this.db.prisma.otpRequest.findFirst({
      where: {
        sellerId,
        phone: email,
        usedAt: null,
        purpose: 'SELLER_LOGIN',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) throw new BadRequestException('OTP not found.');
    if (latest.expiresAt < new Date()) throw new BadRequestException('OTP expired.');

    const valid = await verifyOtpHash(otp, latest.otpHash);
    if (!valid) throw new BadRequestException('Invalid OTP.');

    await this.db.prisma.otpRequest.update({
      where: { id: latest.id },
      data: { usedAt: new Date() },
    });

    await this.db.prisma.seller.update({
      where: { id: sellerId },
      data: { emailVerified: true },
    });

    return { message: 'Email verified successfully.' };
  }

  // =====================================================
  // SELLER GOOGLE LOGIN & ACCOUNT LINKING
  // =====================================================

  async sellerGoogleLogin(googleId: string, email: string, name: string) {
    let seller = await this.db.prisma.seller.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
    });

    if (seller) {
      // Account linking: attach googleId if missing
      if (!seller.googleId) {
        seller = await this.db.prisma.seller.update({
          where: { id: seller.id },
          data: { googleId, emailVerified: true },
        });
      } else if (seller.email && !seller.emailVerified) {
        seller = await this.db.prisma.seller.update({
          where: { id: seller.id },
          data: { emailVerified: true },
        });
      }
    } else {
      // Seller must already have a phone-based account — we don't auto-create
      throw new BadRequestException(
        'No seller account found for this Google account. Please sign up with your mobile number first.',
      );
    }

    let store = (
      await this.db.prisma.store.findFirst({ where: { sellerId: seller.id } })
    ) ?? null;

    const accessToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: seller.id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const refreshToken = await this.jwt.signAsync(
      { role: 'SELLER', sellerId: seller.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    await this.db.prisma.authSession.create({
      data: {
        role: 'SELLER',
        sellerId: seller.id,
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
      },
    });

    return {
      message: 'Seller authenticated via Google',
      seller: { id: seller.id, name: seller.name, email: seller.email, phone: seller.phone },
      store,
      accessToken,
      refreshToken,
    };
  }
}


