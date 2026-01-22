import { forwardRef, Module } from '@nestjs/common';
import { StudentService } from 'src/student/application/student.service';
import { StudentController } from 'src/student/application/student.controller';
import { StudentRepository } from 'src/student/infrastructure/prisma/student.repository';
import { UserModule } from 'src/user/application/user.module';

@Module({
  controllers: [StudentController],
  providers: [
    StudentService,
    {
      provide: 'StudentRepository',
      useClass: StudentRepository,
    },
  ],
  exports: [StudentService],
  imports: [forwardRef(() => UserModule)],
})
export class StudentModule {}
