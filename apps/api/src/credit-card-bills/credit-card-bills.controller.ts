import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreditCardBillDetailDto,
  CreditCardBillListOutputDto,
  CreditCardBillListQueryDto,
  CreditCardBillParamsDto,
  CreditCardBillQueryDto,
  CreditCardBillSummaryDto,
  ReconcileCreditCardBillInputDto,
  UnlinkCreditCardBillOutputDto,
  UpdateCreditCardBillReviewMonthInputDto,
} from '../contracts/api-dtos';
import { CreditCardBillsService } from './credit-card-bills.service';

@Controller('credit-card-bills')
export class CreditCardBillsController {
  constructor(private readonly creditCardBills: CreditCardBillsService) {}

  @Get()
  @ApiOkResponse({ type: CreditCardBillListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({
    name: 'dateBasis',
    enum: ['cash-flow', 'monthly-review'],
    required: false,
  })
  @ZodSerializerDto(CreditCardBillSummaryDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CreditCardBillListQueryDto,
  ) {
    return this.creditCardBills.findAll(user.id, {
      groupId: query.groupId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      dateBasis: query.dateBasis,
    });
  }

  @Get(':accountId/:billMonth')
  @ApiOkResponse({ type: CreditCardBillDetailDto })
  @ApiParam({ name: 'accountId', type: String })
  @ApiParam({ name: 'billMonth', type: String })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(CreditCardBillDetailDto)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CreditCardBillParamsDto,
    @Query() query: CreditCardBillQueryDto,
  ) {
    return this.creditCardBills.findOne(
      user.id,
      query.groupId,
      params.accountId,
      params.billMonth,
    );
  }

  @Patch(':accountId/:billMonth/review-month')
  @ApiOkResponse({ type: CreditCardBillDetailDto })
  @ApiParam({ name: 'accountId', type: String })
  @ApiParam({ name: 'billMonth', type: String })
  @ZodSerializerDto(CreditCardBillDetailDto)
  updateReviewMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CreditCardBillParamsDto,
    @Body() input: UpdateCreditCardBillReviewMonthInputDto,
  ) {
    return this.creditCardBills.updateReviewMonth(
      user.id,
      params.accountId,
      params.billMonth,
      input,
    );
  }

  @Post(':accountId/:billMonth/reconciliation')
  @ApiOkResponse({ type: CreditCardBillDetailDto })
  @ApiParam({ name: 'accountId', type: String })
  @ApiParam({ name: 'billMonth', type: String })
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(CreditCardBillDetailDto)
  reconcile(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CreditCardBillParamsDto,
    @Body() input: ReconcileCreditCardBillInputDto,
  ) {
    return this.creditCardBills.reconcile(
      user.id,
      params.accountId,
      params.billMonth,
      input,
    );
  }

  @Delete(':accountId/:billMonth/reconciliation')
  @ApiOkResponse({ type: UnlinkCreditCardBillOutputDto })
  @ApiParam({ name: 'accountId', type: String })
  @ApiParam({ name: 'billMonth', type: String })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(UnlinkCreditCardBillOutputDto)
  unlink(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CreditCardBillParamsDto,
    @Query() query: CreditCardBillQueryDto,
  ) {
    return this.creditCardBills.unlink(
      user.id,
      query.groupId,
      params.accountId,
      params.billMonth,
    );
  }
}
