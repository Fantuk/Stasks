import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashSync, genSaltSync } from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    const { password: plainPassword } = createUserDto;

    const salt = genSaltSync(Number(process.env.SALT));
    const hashedPassword = hashSync(plainPassword, salt);

    const createdUser = await this.prisma.user
      .create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      })
      .catch((error) => {
        throw new BadRequestException({
          message: 'Ошибка при создании пользователя',
        });
      });

    const { password, ...result } = createdUser;

    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user
      .findUnique({ where: { email } })
      .then((user) => {
        if (!user) {
          return null;
        }
        const { password, ...result } = user;
        return result;
      })
      .catch((error) => {
        throw new BadRequestException({
          message: 'Пользователь с таким email не найден',
        });
      });
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
