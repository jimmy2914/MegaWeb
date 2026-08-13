import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && user.password === password) {
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('No existe una cuenta registrada con ese correo electrónico.');
    }

    if (user.password !== loginDto.password) {
      throw new UnauthorizedException('Contraseña incorrecta. Por favor verifica tus credenciales.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    // Verificar si el email ya está registrado antes de intentar crear
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta registrada con ese correo electrónico.');
    }

    try {
      const user = await this.usersService.create(registerDto);
      const payload = { sub: user.id, email: user.email, role: user.role };
      return {
        user,
        accessToken: this.jwtService.sign(payload),
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      };
    } catch (error: any) {
      // Captura doble seguridad: si Prisma lanza P2002 por condición de carrera
      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta registrada con ese correo electrónico.');
      }
      throw new InternalServerErrorException('Error al crear la cuenta. Por favor intenta más tarde.');
    }
  }
}
