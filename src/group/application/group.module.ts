import { Module } from '@nestjs/common';
import { GroupService } from 'src/group/application/group.service';
import { GroupController } from 'src/group/application/group.controller';

@Module({
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}
