import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScheduleRepository } from 'src/schedule/infrastructure/prisma/schedule.repository';
import { ScheduleService } from 'src/schedule/application/schedule.service';
import { ScheduleController } from 'src/schedule/application/schedule.controller';
import { BellTemplateModule } from 'src/bell-template/application/bell-template.module';
import { GroupModule } from 'src/group/application/group.module';
import { SubjectModule } from 'src/subject/application/subject.module';
import { TeacherModule } from 'src/teacher/application/teacher.module';
import { ClassroomModule } from 'src/classroom/application/classroom.module';

@Module({
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    PrismaService,
    {
      provide: 'ScheduleRepository',
      useClass: ScheduleRepository,
    },
  ],
  exports: [ScheduleService, 'ScheduleRepository'],
  imports: [
    BellTemplateModule,
    GroupModule,
    SubjectModule,
    TeacherModule,
    ClassroomModule,
  ],
})
export class ScheduleModule {}
