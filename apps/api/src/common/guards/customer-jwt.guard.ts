import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwt.verifyAsync(token);
      if (payload.role !== 'CUSTOMER') {
        throw new UnauthorizedException('Invalid role');
      }

      req.user = {
        customerId: payload.sub,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

