import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Categories } from './entities/category.entity';
import { Repository } from 'typeorm';
import {
  CategoryOutput,
  CreateCategoryInputDtoType,
  UpdateCategoryAppearanceInputDtoType,
} from '@fina/types';
import { Groups } from 'src/groups/entities/group.entity';
import { AuthorizationService } from '../auth/authorization.service';
import { NotFoundException } from '@nestjs/common';
import { toDateTimeOutput } from '../common/date-output';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Categories)
    private readonly categoryRepository: Repository<Categories>,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    createCategoryDto: CreateCategoryInputDtoType,
  ): Promise<CategoryOutput> {
    await this.authorization.assertMember(userId, createCategoryDto.groupId);
    const categoryEntity = new Categories({
      name: createCategoryDto.name,
      icon: createCategoryDto.icon,
      color: createCategoryDto.color,
      removed: false,
      group: { id: createCategoryDto.groupId } as Groups,
    });

    const saved = await this.categoryRepository.save(categoryEntity);
    return this.toOutput(saved);
  }

  async findAll(userId: string, groupId: string): Promise<CategoryOutput[]> {
    await this.authorization.assertMember(userId, groupId);
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoinAndSelect('category.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('group_record.id = :groupId', { groupId })
      .andWhere('category.removed = false')
      .orderBy('category.created_at', 'ASC')
      .getMany();
    return categories.map((category) => this.toOutput(category));
  }

  async findOne(userId: string, id: string): Promise<CategoryOutput> {
    const category = await this.findEntity(userId, id);
    return this.toOutput(category);
  }

  async updateAppearance(
    userId: string,
    id: string,
    input: UpdateCategoryAppearanceInputDtoType,
  ): Promise<CategoryOutput> {
    const category = await this.findEntity(userId, id);
    await this.categoryRepository.update(
      { id, group: { id: category.group.id } },
      { icon: input.icon, color: input.color },
    );
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const category = await this.findEntity(userId, id);
    await this.categoryRepository.update(
      { id, group: { id: category.group.id } },
      { removed: true },
    );
    return { id };
  }

  private async findEntity(userId: string, id: string): Promise<Categories> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoinAndSelect('category.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('category.id = :id', { id })
      .andWhere('category.removed = false')
      .getOne();
    if (!category) throw new NotFoundException('Resource not found');
    return category;
  }

  private toOutput(category: Categories): CategoryOutput {
    return {
      id: category.id,
      createdAt: toDateTimeOutput(category.createdAt),
      name: category.name,
      icon: category.icon,
      color: category.color,
      groupId: category.group.id,
    };
  }
}
