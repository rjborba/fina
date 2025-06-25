import {
  Controller,
  Get,
  // Post,
  Body,
  // Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
// import { CreateUserGroupDto } from './dto/create-user-group.dto';
// import { UpdateUserGroupDto } from './dto/update-user-group.dto';

@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  // @Post()
  // create(@Body() createUserGroupDto: CreateUserGroupDto) {
  //   return this.userGroupsService.create(createUserGroupDto);
  // }

  @Get()
  findAll() {
    return this.userGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(+id);
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateUserGroupDto: UpdateUserGroupDto,
  // ) {
  //   return this.userGroupsService.update(+id, updateUserGroupDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userGroupsService.remove(+id);
  }
}
