import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../auth/authorization.module';
import { CustomValuesController } from './custom-values.controller';
import { CustomValuesService } from './custom-values.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [CustomValuesController],
  providers: [CustomValuesService],
})
export class CustomValuesModule {}
