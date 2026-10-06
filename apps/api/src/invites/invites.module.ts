import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invites } from './entities/invite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invites])],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
