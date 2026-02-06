import { Module } from '@nestjs/common';
import { SubjectService } from 'src/subject/application/subject.service';
import { SubjectController } from 'src/subject/application/subject.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubjectRepository } from 'src/subject/infrastructure/prisma/subject.repository';
import { GroupModule } from 'src/group/application/group.module';
import { TeacherModule } from 'src/teacher/application/teacher.module';

@Module({
  controllers: [SubjectController],
  providers: [
    SubjectService,
    PrismaService,
    { provide: 'SubjectRepository', useClass: SubjectRepository },
  ],
  exports: [SubjectService, 'SubjectRepository'],
  imports: [GroupModule, TeacherModule],
})
export class SubjectModule {}