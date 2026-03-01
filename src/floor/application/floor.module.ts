import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuildingModule } from 'src/building/application/building.module';
import { FloorRepository } from 'src/floor/infrastructure/prisma/floor.repository';
import { FloorService } from 'src/floor/application/floor.service';
import { FloorController } from 'src/floor/application/floor.controller';

@Module({
  controllers: [FloorController],
  providers: [
    FloorService,
    PrismaService,
    {
      provide: 'FloorRepository',
      useClass: FloorRepository,
    },
  ],
  exports: [FloorService, 'FloorRepository'],
  imports: [BuildingModule],
})
export class FloorModule {}
