import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { BankaccountsService } from './bankaccounts.service';
import { CreateBankaccountInputDto } from '@fina/types';

@Controller('bankaccounts')
export class BankaccountsController {
  constructor(private readonly bankaccountsService: BankaccountsService) {}

  @Post()
  create(@Body() createBankaccountDto: CreateBankaccountInputDto) {
    return this.bankaccountsService.create(createBankaccountDto);
  }

  // TODO: Use input DTO
  @Get()
  findAll(@Query('groupId') groupId: string) {
    if (!groupId) {
      throw new BadRequestException('groupId is required');
    }
    return this.bankaccountsService.findAll(groupId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankaccountsService.remove(id);
  }
}
