/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { FormatFactory, RowHeightMode } from '../../../types';
import type { DatatableColumnResult } from '../../impl/datatable/datatable_column';
import type { DatatableExpressionFunction } from './types';

export interface SortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface PagingState {
  size: number;
  enabled: boolean;
}

export interface DatatableArgs {
  title: string;
  description?: string;
  columns: DatatableColumnResult[];
  sortingColumnId: SortingState['columnId'];
  sortingDirection: SortingState['direction'];
  fitRowToContent?: boolean;
  rowHeightLines?: number;
  headerRowHeight?: RowHeightMode;
  headerRowHeightLines?: number;
  pageSize?: PagingState['size'];
  density?: DataGridDensity;
}

/**
 * Available datatables logged to inspector
 */
export const DatatableInspectorTables = {
  Default: 'default',
  Transpose: 'transpose',
};

export const getDatatable = (
  getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
): DatatableExpressionFunction => ({
  name: 'lens_datatable',
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('xpack.lens.datatable.expressionHelpLabel', {
    defaultMessage: 'Datatable renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.datatable.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
    columns: {
      types: ['lens_datatable_column'],
      help: '',
      multi: true,
    },
    sortingColumnId: {
      types: ['string'],
      help: '',
    },
    sortingDirection: {
      types: ['string'],
      help: '',
    },
    fitRowToContent: {
      types: ['boolean'],
      help: '',
    },
    rowHeightLines: {
      types: ['number'],
      help: '',
    },
    headerRowHeight: {
      types: ['string'],
      help: '',
    },
    headerRowHeightLines: {
      types: ['number'],
      help: '',
    },
    pageSize: {
      types: ['number'],
      help: '',
    },
    density: {
      types: ['string'],
      help: '',
    },
  },
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { datatableFn } = await import('../../impl/async_fns');
    return datatableFn(getFormatFactory)(...args);
  },
});
