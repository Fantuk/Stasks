import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FloorModule } from 'src/floor/application/floor.module';
import { ClassroomRepository } from 'src/classroom/infrastructure/prisma/classroom.repository';
import { ClassroomService } from 'src/classroom/application/classroom.service';
import { ClassroomController } from 'src/classroom/application/classroom.controller';

@Module({
  controllers: [ClassroomController],
  providers: [
    ClassroomService,
    PrismaService,
    {
      provide: 'ClassroomRepository',
      useClass: ClassroomRepository,
    },
  ],
  exports: [ClassroomService, 'ClassroomRepository'],
  imports: [FloorModule],
})
export class ClassroomModule {}
