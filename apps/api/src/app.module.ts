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
import { UsersModule } from './users/users.module';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'aws-0-us-west-1.pooler.supabase.com',
      port: 6543,
      username: 'postgres.krgwgeabxeyvejwscoer',
      password: 'finasupabase',
      database: 'postgres',
      schema: 'public',
      entities: [
        Transactions,
        Bankaccounts,
        Groups,
        UserGroup,
        Categories,
        Users,
        Imports,
        Invites,
      ],
      // synchronize: true,
      logging: true,
    }),
    TransactionsModule,
    CategoriesModule,
    GroupsModule,
    BankaccountsModule,
    UserGroupsModule,
    InvitesModule,
    ImportsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
})
export class AppModule {}
