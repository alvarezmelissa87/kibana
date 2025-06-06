/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { ALL_VALUE, Paginated, Pagination, sloDefinitionSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import { merge } from 'lodash';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { SLODefinition, StoredSLODefinition } from '../domain/models';
import { SLONotFound } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';

export interface SLORepository {
  create(slo: SLODefinition): Promise<SLODefinition>;
  update(slo: SLODefinition): Promise<SLODefinition>;
  findAllByIds(ids: string[]): Promise<SLODefinition[]>;
  findById(id: string): Promise<SLODefinition>;
  deleteById(id: string, options?: { ignoreNotFound?: boolean }): Promise<void>;
  search(
    search: string,
    pagination: Pagination,
    options?: {
      includeOutdatedOnly: boolean;
      tags: string[];
    }
  ): Promise<Paginated<SLODefinition>>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract, private logger: Logger) {}

  async create(slo: SLODefinition): Promise<SLODefinition> {
    await this.soClient.create<StoredSLODefinition>(SO_SLO_TYPE, toStoredSLO(slo));
    return slo;
  }

  async update(slo: SLODefinition): Promise<SLODefinition> {
    let existingSavedObjectId: string | undefined;

    const findResponse = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: 1,
      filter: `slo.attributes.id:(${slo.id})`,
    });
    if (findResponse.total === 1) {
      existingSavedObjectId = findResponse.saved_objects[0].id;
    }

    await this.soClient.create<StoredSLODefinition>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return slo;
  }

  async findById(id: string): Promise<SLODefinition> {
    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    const slo = this.toSLO(response.saved_objects[0]);
    if (slo === undefined) {
      throw new Error('Invalid stored SLO');
    }

    return slo;
  }

  async deleteById(id: string, { ignoreNotFound = false }): Promise<void> {
    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      if (ignoreNotFound) {
        return;
      }
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    await this.soClient.delete(SO_SLO_TYPE, response.saved_objects[0].id);
  }

  async findAllByIds(ids: string[]): Promise<SLODefinition[]> {
    if (ids.length === 0) return [];

    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: ids.length,
      filter: `slo.attributes.id:(${ids.join(' or ')})`,
    });

    return response.saved_objects
      .map((slo) => this.toSLO(slo))
      .filter((slo) => slo !== undefined) as SLODefinition[];
  }

  async search(
    search: string,
    pagination: Pagination,
    options: {
      includeOutdatedOnly?: boolean;
      tags: string[];
    } = { tags: [] }
  ): Promise<Paginated<SLODefinition>> {
    const { includeOutdatedOnly, tags } = options;
    const filter = [];
    if (tags.length > 0) {
      filter.push(`slo.attributes.tags: (${tags.join(' OR ')})`);
    }

    if (!!includeOutdatedOnly) {
      filter.push(`slo.attributes.version < ${SLO_MODEL_VERSION}`);
    }

    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      search,
      searchFields: ['name'],
      ...(filter.length && { filter: filter.join(' AND ') }),
      sortField: 'id',
      sortOrder: 'asc',
    });

    return {
      total: response.total,
      perPage: response.per_page,
      page: response.page,
      results: response.saved_objects
        .map((savedObject) => this.toSLO(savedObject))
        .filter((slo) => slo !== undefined) as SLODefinition[],
    };
  }

  toSLO(storedSLOObject: SavedObject<StoredSLODefinition>): SLODefinition | undefined {
    const storedSLO = storedSLOObject.attributes;
    const result = sloDefinitionSchema.decode({
      ...storedSLO,
      // groupBy was added in 8.10.0
      groupBy: storedSLO.groupBy ?? ALL_VALUE,
      // version was added in 8.12.0. This is a safeguard against SO migration issue.
      // if not present, we considered the version to be 1, e.g. not migrated.
      // We would need to call the _reset api on this SLO.
      version: storedSLO.version ?? 1,
      // settings.preventInitialBackfill was added in 8.15.0
      settings: merge(
        { preventInitialBackfill: false, syncDelay: '1m', frequency: '1m' },
        storedSLO.settings
      ),
      createdBy: storedSLO.createdBy ?? storedSLOObject.created_by,
      updatedBy: storedSLO.updatedBy ?? storedSLOObject.updated_by,
    });

    if (isLeft(result)) {
      this.logger.debug(`Invalid stored SLO with id [${storedSLO.id}]`);
      return undefined;
    }

    return result.right;
  }
}

function toStoredSLO(slo: SLODefinition): StoredSLODefinition {
  return sloDefinitionSchema.encode(slo);
}
