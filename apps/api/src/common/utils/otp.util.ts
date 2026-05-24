import * as bcrypt from 'bcrypt';

export function generateOtp(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

export async function hashOtp(otp: string) {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

export async function verifyOtpHash(otp: string, hash: string) {
  return bcrypt.compare(otp, hash);
}
