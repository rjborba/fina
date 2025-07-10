import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Query,
  Post,
  Patch,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryInputDtoType } from '@fina/types';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryInputDtoType) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll(@Query('groupId') groupId: string) {
    return this.categoriesService.findAll(groupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  update() {
    return this.categoriesService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
