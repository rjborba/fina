import {
  Controller,
  Get,
  // Post,
  Body,
  // Patch,
  Param,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { ImportsService } from './imports.service';
import { CreateImportInputDto } from '@fina/types';
// import { CreateImportDto } from './dto/create-import.dto';
// import { UpdateImportDto } from './dto/update-import.dto';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  create(@Body() createImportDto: CreateImportInputDto) {
    return this.importsService.create(createImportDto);
  }

  @Get()
  findAll(@Query('groupId') groupId: string) {
    return this.importsService.findAll(groupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.importsService.findOne(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateImportDto: UpdateImportDto) {
  //   return this.importsService.update(+id, updateImportDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.importsService.remove(id);
  }
}
