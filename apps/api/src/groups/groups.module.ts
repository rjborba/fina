import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Groups } from './entities/group.entity';
import { UserGroup } from '../user-groups/entities/user-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Groups, UserGroup])],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
