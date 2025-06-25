import { Injectable } from '@nestjs/common';
// import { CreateBankaccountDto } from './dto/create-bankaccount.dto';
// import { UpdateBankaccountDto } from './dto/update-bankaccount.dto';

@Injectable()
export class BankaccountsService {
  // create(createBankaccountDto: CreateBankaccountDto) {
  //   return 'This action adds a new bankaccount';
  // }

  findAll() {
    return `This action returns all bankaccounts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bankaccount`;
  }

  // update(id: number, updateBankaccountDto: UpdateBankaccountDto) {
  //   return `This action updates a #${id} bankaccount`;
  // }

  remove(id: number) {
    return `This action removes a #${id} bankaccount`;
  }
}
