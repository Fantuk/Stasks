import { Module, forwardRef } from '@nestjs/common';
import { ModeratorService } from './moderator.service';
import { ModeratorController } from 'src/moderator/application/moderator.controller';
import { ModeratorRepository } from 'src/moderator/infrastructure/prisma/moderator.repository';
import { UserModule } from 'src/user/application/user.module';

@Module({
  controllers: [ModeratorController],
  providers: [
    ModeratorService,
    {
      provide: 'ModeratorRepository',
      useClass: ModeratorRepository,
    },
  ],
  exports: [ModeratorService],
  imports: [forwardRef(() => UserModule)],
})
export class ModeratorModule {}
