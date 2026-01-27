import { forwardRef, Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from 'src/teacher/application/teacher.controller';
import { TeacherRepository } from 'src/teacher/infrastructure/prisma/teacher.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserModule } from 'src/user/application/user.module';
import { GroupModule } from 'src/group/application/group.module';

@Module({
  controllers: [TeacherController],
  providers: [
    TeacherService,
    PrismaService,
    {
      provide: 'TeacherRepository',
      useClass: TeacherRepository,
    },
  ],
  exports: [TeacherService],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
  ],
})
export class TeacherModule { }
