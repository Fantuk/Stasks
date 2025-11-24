import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { hashSync, genSaltSync } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(registerData: RegisterDto) {
    const { password: plainPassword, email } = registerData;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        message: 'Пользователь с таким email уже существует',
      });
    }

    const salt = genSaltSync(Number(process.env.SALT));
    const hashedPassword = hashSync(plainPassword, salt);

    const createdUser = await this.prisma.user
      .create({
        data: {
          ...registerData,
          password: hashedPassword,
        },
      })
      .catch((error) => {
        throw new BadRequestException(error.message);
      });

    const { password, ...result } = createdUser;
    
    return result;
  }
}
