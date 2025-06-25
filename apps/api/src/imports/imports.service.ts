import { Injectable } from '@nestjs/common';
// import { CreateImportDto } from './dto/create-import.dto';
// import { UpdateImportDto } from './dto/update-import.dto';

@Injectable()
export class ImportsService {
  // create(createImportDto: CreateImportDto) {
  //   return 'This action adds a new import';
  // }

  findAll() {
    return `This action returns all imports`;
  }

  findOne(id: number) {
    return `This action returns a #${id} import`;
  }

  // update(id: number, updateImportDto: UpdateImportDto) {
  //   return `This action updates a #${id} import`;
  // }

  remove(id: number) {
    return `This action removes a #${id} import`;
  }
}
