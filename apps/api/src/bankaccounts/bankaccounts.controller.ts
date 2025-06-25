import {
  Controller,
  Get,
  // Post,
  Body,
  // Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BankaccountsService } from './bankaccounts.service';
// import { CreateBankaccountDto } from './dto/create-bankaccount.dto';
// import { UpdateBankaccountDto } from './dto/update-bankaccount.dto';

@Controller('bankaccounts')
export class BankaccountsController {
  constructor(private readonly bankaccountsService: BankaccountsService) {}

  // @Post()
  // create(@Body() createBankaccountDto: CreateBankaccountDto) {
  //   return this.bankaccountsService.create(createBankaccountDto);
  // }

  @Get()
  findAll() {
    return this.bankaccountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankaccountsService.findOne(+id);
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateBankaccountDto: UpdateBankaccountDto,
  // ) {
  //   return this.bankaccountsService.update(+id, updateBankaccountDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankaccountsService.remove(+id);
  }
}
