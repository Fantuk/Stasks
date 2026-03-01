import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BellTemplateRepository } from 'src/bell-template/infrastructure/prisma/bell-template.repository';
import { BellTemplateService } from 'src/bell-template/application/bell-template.service';
import { BellTemplateController } from 'src/bell-template/application/bell-template.controller';

@Module({
  controllers: [BellTemplateController],
  providers: [
    BellTemplateService,
    PrismaService,
    {
      provide: 'BellTemplateRepository',
      useClass: BellTemplateRepository,
    },
  ],
  exports: [BellTemplateService, 'BellTemplateRepository'],
})
export class BellTemplateModule {}
