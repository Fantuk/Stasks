import { Controller } from '@nestjs/common';
import { GroupService } from 'src/group/application/group.service';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}
}
