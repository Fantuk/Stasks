import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
  ) {}

  async register(registerData: CreateUserDto) {
    const user = await this.userService.findByEmail(registerData.email);
    if (user) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    return this.userService.create(registerData);
  }
}
