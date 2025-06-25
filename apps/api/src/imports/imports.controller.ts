import {
  Controller,
  Get,
  // Post,
  Body,
  // Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ImportsService } from './imports.service';
// import { CreateImportDto } from './dto/create-import.dto';
// import { UpdateImportDto } from './dto/update-import.dto';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  // @Post()
  // create(@Body() createImportDto: CreateImportDto) {
  //   return this.importsService.create(createImportDto);
  // }

  @Get()
  findAll() {
    return this.importsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.importsService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateImportDto: UpdateImportDto) {
  //   return this.importsService.update(+id, updateImportDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.importsService.remove(+id);
  }
}
