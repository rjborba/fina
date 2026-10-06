import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from '../user-groups/entities/user-group.entity';
import { AuthorizationService } from './authorization.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserGroup])],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
