import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository } from '../infrastructure/prisma/user.repository';
import { ModeratorModule } from 'src/moderator/application/moderator.module';
import { TeacherModule } from 'src/teacher/application/teacher.module';
import { StudentModule } from 'src/student/application/student.module';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    {
      provide: 'UserRepository',
      useClass: UserRepository,
    },
  ],
  exports: [UserService, 'UserRepository'],
  imports: [
    forwardRef(() => ModeratorModule),
    forwardRef(() => TeacherModule),
    forwardRef(() => StudentModule),
  ],
})
export class UserModule {}
