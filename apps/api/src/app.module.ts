import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from './transactions/transactions.module';
import { Groups } from './groups/entities/group.entity';
import { Transactions } from './transactions/entities/transaction.entity';
import { Bankaccounts } from './bankaccounts/entities/bankaccount.entity';
import { Categories } from './categories/entities/category.entity';
import { UserGroup } from './user-groups/entities/user-group.entity';
import { Imports } from './imports/entities/import.entity';
import { Users } from './users/entities/user.entity';
import { Invites } from './invites/entities/invite.entity';
import { CategoriesModule } from './categories/categories.module';
import { GroupsModule } from './groups/groups.module';
import { BankaccountsModule } from './bankaccounts/bankaccounts.module';
import { UserGroupsModule } from './user-groups/user-groups.module';
import { InvitesModule } from './invites/invites.module';
import { ImportsModule } from './imports/imports.module';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { Environment, validateEnvironment } from './config/environment';
import { ConfigService } from '@nestjs/config';
import { AuthorizationModule } from './auth/authorization.module';
import { ApiExceptionFilter } from './errors/api-exception.filter';
import { ImportProfiles } from './imports/entities/import-profile.entity';
import { ImportFiles } from './imports/entities/import-file.entity';
import { CreditCardBillReconciliations } from './credit-card-bills/entities/credit-card-bill-reconciliation.entity';
import { CreditCardBillsModule } from './credit-card-bills/credit-card-bills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const databaseUrl = config.get('DATABASE_URL', { infer: true });
        const connection = databaseUrl
          ? { url: databaseUrl }
          : {
              host: config.get('DATABASE_HOST', { infer: true }),
              port: config.get('DATABASE_PORT', { infer: true }),
              username: config.get('DATABASE_USER', { infer: true }),
              password: config.get('DATABASE_PASSWORD', { infer: true }),
              database: config.get('DATABASE_NAME', { infer: true }),
            };

        return {
          type: 'postgres',
          ...connection,
          schema: config.get('DATABASE_SCHEMA', { infer: true }),
          ssl: config.get('DATABASE_SSL', { infer: true })
            ? { rejectUnauthorized: true }
            : false,
          entities: [
            Transactions,
            Bankaccounts,
            Groups,
            UserGroup,
            Categories,
            Users,
            Imports,
            ImportFiles,
            ImportProfiles,
            Invites,
            CreditCardBillReconciliations,
          ],
          synchronize: false,
          logging: false,
        };
      },
    }),
    AuthorizationModule,
    TransactionsModule,
    CategoriesModule,
    GroupsModule,
    BankaccountsModule,
    UserGroupsModule,
    InvitesModule,
    ImportsModule,
    CreditCardBillsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
