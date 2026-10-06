import {
  BadRequestException,
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Post,
  Query,
  HttpCode,
  PipeTransform,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ImportsService, UploadedImportFile } from './imports.service';
import {
  CreateImportInputDto,
  DeleteImportOutputDto,
  ImportListOutputDto,
  ImportProfileListOutputDto,
  ImportProfileOutputDto,
  ImportProfileQueryDto,
  ImportOutputDto,
  PreviewImportInputDto,
  PreviewImportOutputDto,
  GroupQueryInputDto,
  IdParamDto,
} from '../contracts/api-dtos';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { ZodSerializerDto, ZodValidationPipe } from 'nestjs-zod';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_LIMITS } from '@fina/types';

class ParseJsonPipe implements PipeTransform<string, unknown> {
  transform(value: string): unknown {
    if (typeof value !== 'string') {
      throw new BadRequestException('The import payload is required');
    }
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new BadRequestException('The import payload must be valid JSON');
    }
  }
}

@Controller('imports')
@ApiExtraModels(CreateImportInputDto)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOkResponse({ type: PreviewImportOutputDto })
  @ZodSerializerDto(PreviewImportOutputDto)
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() previewImportDto: PreviewImportInputDto,
  ) {
    return this.importsService.preview(user.id, previewImportDto);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fields: 1,
        fileSize: IMPORT_LIMITS.maxFileBytes,
        fieldSize: IMPORT_LIMITS.maxRequestBytes,
        parts: 3,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['payload', 'file'],
      properties: {
        payload: { $ref: getSchemaPath(CreateImportInputDto) },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: ImportOutputDto })
  @ZodSerializerDto(ImportOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(
      'payload',
      new ParseJsonPipe(),
      new ZodValidationPipe(CreateImportInputDto),
    )
    createImportDto: unknown,
    @UploadedFile() file: UploadedImportFile | undefined,
  ) {
    return this.importsService.create(
      user.id,
      createImportDto as CreateImportInputDto,
      file,
    );
  }

  @Get()
  @ApiOkResponse({ type: ImportListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(ImportOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GroupQueryInputDto,
  ) {
    return this.importsService.findAll(user.id, query.groupId);
  }

  @Get('profiles')
  @ApiOkResponse({ type: ImportProfileListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ApiQuery({ name: 'fingerprint', type: String, required: true })
  @ZodSerializerDto(ImportProfileOutputDto)
  findProfiles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ImportProfileQueryDto,
  ) {
    return this.importsService.findProfiles(
      user.id,
      query.groupId,
      query.fingerprint,
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: ImportOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(ImportOutputDto)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.importsService.findOne(user.id, params.id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteImportOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteImportOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.importsService.remove(user.id, params.id);
  }
}
