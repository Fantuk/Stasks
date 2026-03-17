import { forwardRef, Module } from '@nestjs/common';
import { GroupService } from 'src/group/application/group.service';
import { GroupController } from 'src/group/application/group.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupRepository } from 'src/group/infrastructure/prisma/group.repository';
import { TeacherModule } from 'src/teacher/application/teacher.module';
import { StudentModule } from 'src/student/application/student.module';
import { SubjectModule } from 'src/subject/application/subject.module';

@Module({
  controllers: [GroupController],
  providers: [
    GroupService,
    PrismaService,
    {
      provide: 'GroupRepository',
      useClass: GroupRepository,
    },
  ],
  exports: [GroupService, 'GroupRepository'],
  imports: [
    forwardRef(() => TeacherModule),
    forwardRef(() => StudentModule),
    forwardRef(() => SubjectModule),
  ],
})
export class GroupModule {}
