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
import {
  CategoryListOutputDto,
  CategoryOutputDto,
  CreateCategoryInputDto,
  IdParamDto,
  QueryCategoryInputDto,
  DeleteCategoryOutputDto,
  UpdateCategoryAppearanceInputDto,
} from '../contracts/api-dtos';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiCreatedResponse({ type: CategoryOutputDto })
  @ZodSerializerDto(CategoryOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createCategoryDto: CreateCategoryInputDto,
  ) {
    return this.categoriesService.create(user.id, createCategoryDto);
  }

  @Get()
  @ApiOkResponse({ type: CategoryListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(CategoryOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCategoryInputDto,
  ) {
    return this.categoriesService.findAll(user.id, query.groupId);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(CategoryOutputDto)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.categoriesService.findOne(user.id, params.id);
  }

  @Patch(':id/appearance')
  @ApiOkResponse({ type: CategoryOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(CategoryOutputDto)
  updateAppearance(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: UpdateCategoryAppearanceInputDto,
  ) {
    return this.categoriesService.updateAppearance(user.id, params.id, input);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteCategoryOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteCategoryOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.categoriesService.remove(user.id, params.id);
  }
}
