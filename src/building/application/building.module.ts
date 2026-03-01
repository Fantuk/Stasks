import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuildingRepository } from 'src/building/infrastructure/prisma/building.repository';
import { BuildingService } from 'src/building/application/building.service';
import { BuildingController } from 'src/building/application/building.controller';

@Module({
  controllers: [BuildingController],
  providers: [
    BuildingService,
    PrismaService,
    {
      provide: 'BuildingRepository',
      useClass: BuildingRepository,
    },
  ],
  exports: [BuildingService, 'BuildingRepository'],
})
export class BuildingModule {}
