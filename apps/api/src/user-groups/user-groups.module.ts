import { Module } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';

@Module({
  controllers: [UserGroupsController],
  providers: [UserGroupsService],
})
export class UserGroupsModule {}
