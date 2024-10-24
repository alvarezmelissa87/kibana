/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, Plugin } from 'src/core/public';

import './index.scss';
import {
  createSavedObjectClass,
  SavedObjectDecoratorRegistry,
  SavedObjectDecoratorConfig,
} from './saved_object';
import { DataPublicPluginStart } from '../../data/public';
import { DataViewsPublicPluginStart } from '../../data_views/public';
import { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';
import { SavedObject } from './types';

export interface SavedObjectSetup {
  registerDecorator: (config: SavedObjectDecoratorConfig<any>) => void;
}

export interface SavedObjectsStart {
  /** @deprecated */
  SavedObjectClass: new (raw: Record<string, any>) => SavedObject;
  /** @deprecated */
  settings: {
    /** @deprecated */
    getPerPage: () => number;
    /** @deprecated */
    getListingLimit: () => number;
  };
}

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class SavedObjectsPublicPlugin
  implements Plugin<SavedObjectSetup, SavedObjectsStart, object, SavedObjectsStartDeps>
{
  private decoratorRegistry = new SavedObjectDecoratorRegistry();

  public setup(): SavedObjectSetup {
    return {
      registerDecorator: (config) => this.decoratorRegistry.register(config),
    };
  }
  public start(core: CoreStart, { data, dataViews }: SavedObjectsStartDeps) {
    return {
      SavedObjectClass: createSavedObjectClass(
        {
          dataViews,
          savedObjectsClient: core.savedObjects.client,
          search: data.search,
          chrome: core.chrome,
          overlays: core.overlays,
        },
        this.decoratorRegistry
      ),
      settings: {
        getPerPage: () => core.uiSettings.get(PER_PAGE_SETTING),
        getListingLimit: () => core.uiSettings.get(LISTING_LIMIT_SETTING),
      },
    };
  }
}
