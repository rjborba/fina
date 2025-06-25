import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupsController } from './user-groups.controller';
import { UserGroupsService } from './user-groups.service';

describe('UserGroupsController', () => {
  let controller: UserGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserGroupsController],
      providers: [UserGroupsService],
    }).compile();

    controller = module.get<UserGroupsController>(UserGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
