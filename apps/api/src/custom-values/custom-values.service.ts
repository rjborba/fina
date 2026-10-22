import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CustomValue,
  SaveCustomValue,
  parseCustomFormula,
  rewriteCustomFormula,
  FormulaError,
  hasInvalidFormulaNameCharacters,
} from '@fina/types';
import { AuthorizationService } from '../auth/authorization.service';
import { Groups } from '../groups/entities/group.entity';
import { Categories } from '../categories/entities/category.entity';
import { CustomValues } from './entities/custom-value.entity';

const normalized = (name: string) =>
  name.normalize('NFKC').trim().toLowerCase();
type Reference = { key: string; name: string };

@Injectable()
export class CustomValuesService {
  constructor(
    private readonly database: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  private async records(manager: EntityManager, groupId: string) {
    const [tiles, categories] = await Promise.all([
      manager
        .getRepository(CustomValues)
        .find({ where: { group: { id: groupId } }, order: { id: 'ASC' } }),
      manager
        .getRepository(Categories)
        .find({ where: { group: { id: groupId } } }),
    ]);
    const references: Reference[] = [
      ...categories.map((category) => ({
        key: `category:${category.id}`,
        name: category.name,
      })),
      ...tiles.map((tile) => ({ key: `tile:${tile.id}`, name: tile.title })),
    ];
    return { tiles, references };
  }

  private present(
    tile: CustomValues,
    groupId: string,
    references: Reference[],
  ): CustomValue {
    const byKey = new Map(
      references.map((reference) => [reference.key, reference]),
    );
    return {
      id: tile.id,
      groupId,
      title: tile.title,
      resolvedExpression: tile.resolvedExpression,
      expression: rewriteCustomFormula(tile.resolvedExpression, (key) => {
        const reference = byKey.get(key);
        if (
          !reference ||
          /^(category|tile):\d+$/.test(reference.name) ||
          hasInvalidFormulaNameCharacters(reference.name) ||
          references.filter(
            (item) => normalized(item.name) === normalized(reference.name),
          ).length !== 1
        )
          return key;
        return reference.name;
      }),
    };
  }

  async findAll(userId: string, groupId: string): Promise<CustomValue[]> {
    await this.authorization.assertMember(userId, groupId);
    const { tiles, references } = await this.records(
      this.database.manager,
      groupId,
    );
    return tiles.map((tile) => this.present(tile, groupId, references));
  }

  private async write<T>(
    userId: string,
    groupId: string,
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await this.authorization.assertMember(userId, groupId);
    return this.database.transaction(async (manager) => {
      // Serialize graph changes within one workspace, including concurrent edits/deletes.
      const workspace = await manager
        .getRepository(Groups)
        .createQueryBuilder('workspace')
        .innerJoin(
          'workspace.userGroups',
          'membership',
          'membership.user_id = :userId',
          { userId },
        )
        .where('workspace.id = :groupId', { groupId })
        .setLock('pessimistic_write', undefined, ['workspace'])
        .getOne();
      if (!workspace) throw new NotFoundException('Resource not found');
      return operation(manager);
    });
  }

  async save(
    userId: string,
    groupId: string,
    input: SaveCustomValue,
    id?: string,
  ): Promise<CustomValue> {
    return this.write(userId, groupId, async (manager) => {
      const { tiles, references } = await this.records(manager, groupId);
      let tile = id
        ? tiles.find((item) => item.id === id)
        : manager
            .getRepository(CustomValues)
            .create({ group: { id: groupId } });
      if (!tile) throw new NotFoundException('Resource not found');
      if (!id && tiles.length >= 100)
        throw new BadRequestException(
          'A workspace can have at most 100 custom tiles',
        );
      if (
        /^(category|tile):\d+$/i.test(input.title) ||
        references.some(
          (reference) =>
            reference.key !== `tile:${id}` &&
            normalized(reference.name) === normalized(input.title),
        )
      ) {
        throw new ConflictException(
          'Choose a unique title different from existing categories and tiles',
        );
      }
      try {
        const resolvedExpression = rewriteCustomFormula(
          input.expression,
          (name) => {
            const explicit = references.find(
              (reference) => reference.key === name,
            );
            const matches = explicit
              ? [explicit]
              : references.filter(
                  (reference) =>
                    normalized(reference.name) === normalized(name),
                );
            if (matches.length !== 1)
              throw new FormulaError(
                'Unknown or ambiguous reference. Choose a category or tile suggestion.',
              );
            return matches[0].key;
          },
        );
        const graph = new Map(
          tiles.map((item) => [item.id, item.resolvedExpression]),
        );
        const currentId = id ?? 'new';
        graph.set(currentId, resolvedExpression);
        const visiting = new Set<string>();
        const visited = new Set<string>();
        const visit = (key: string) => {
          if (visiting.has(key))
            throw new FormulaError('Circular tile references are not allowed.');
          if (visited.has(key)) return;
          if (!graph.has(key))
            throw new FormulaError('Referenced tile is unavailable.');
          visiting.add(key);
          for (const reference of parseCustomFormula(graph.get(key)!)
            .references) {
            if (reference.startsWith('tile:')) visit(reference.slice(5));
          }
          visiting.delete(key);
          visited.add(key);
        };
        for (const key of graph.keys()) visit(key);
        tile.title = input.title;
        tile.resolvedExpression = resolvedExpression;
        tile = await manager.getRepository(CustomValues).save(tile);
        const latest = await this.records(manager, groupId);
        return this.present(tile, groupId, latest.references);
      } catch (error) {
        if (error instanceof FormulaError)
          throw new BadRequestException(error.message);
        throw error;
      }
    });
  }

  async remove(userId: string, groupId: string, id: string) {
    return this.write(userId, groupId, async (manager) => {
      const { tiles } = await this.records(manager, groupId);
      if (!tiles.some((tile) => tile.id === id))
        throw new NotFoundException('Resource not found');
      if (
        tiles.some((tile) =>
          parseCustomFormula(tile.resolvedExpression).references.includes(
            `tile:${id}`,
          ),
        )
      )
        throw new ConflictException(
          'This tile is used by another formula. Update that formula before deleting it.',
        );
      await manager
        .getRepository(CustomValues)
        .delete({ id, group: { id: groupId } });
      return { id };
    });
  }
}
