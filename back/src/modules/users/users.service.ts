import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user || undefined;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user || undefined;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.prisma.user.findMany();
  }

  async create(payload: Partial<UserEntity>): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        name: payload.name || 'Unnamed',
        email: payload.email || 'unknown@megaworld.com',
        password: await bcrypt.hash(payload.password || 'changeme', 10),
        role: payload.role || 'CLIENT',
      },
    });
  }

  async updateProfile(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }
}
