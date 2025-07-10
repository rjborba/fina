import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Categories } from './entities/category.entity';
import { Repository } from 'typeorm';
import { CreateCategoryInputDtoType } from '@fina/types';
import { Groups } from 'src/groups/entities/group.entity';
// import { CreateCategoryDto } from './dto/create-category.dto';
// import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Categories)
    private readonly categoryRepository: Repository<Categories>,
  ) {}

  create(createCategoryDto: CreateCategoryInputDtoType) {
    const categoryEntity = new Categories({
      name: createCategoryDto.name,
      group: { id: createCategoryDto.groupId } as Groups,
    });

    return this.categoryRepository.save(categoryEntity);
  }

  findAll(groupId: string) {
    return this.categoryRepository.find({
      where: { group: { id: groupId } },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  update() {
    throw new Error('Not implemented');
  }

  remove(id: string) {
    return this.categoryRepository.delete(id);
  }
}
