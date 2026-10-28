/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { DataGridDensity, getDataGridDensityPadding } from '@kbn/unified-data-table';
import { mathWithUnits, useEuiTheme } from '@elastic/eui';
import { SparklineChart } from './sparkline_chart';
import type { ProfileProviderServices } from '../../profile_provider_services';

interface SparklineRendererProps {
  charts: ChartsPluginStart;
  values: unknown;
  isSelected?: boolean;
}

/** The pattern currently drawn as the histogram's selected series. */
export const SparklineComparisonContext = createContext<
  { column: string; value: string } | undefined
>(undefined);

const isNumberArray = (values: unknown): values is number[] =>
  Array.isArray(values) && values.every((item) => typeof item === 'number');

export const SparklineRenderer: FC<SparklineRendererProps> = ({
  charts,
  values,
  isSelected = false,
}) => {
  const typedValues = useMemo(() => (isNumberArray(values) ? values : undefined), [values]);
  return typedValues === undefined ? (
    '-'
  ) : (
    <SparklineChart charts={charts} values={typedValues} isSelected={isSelected} />
  );
};

export const SparklineCellRenderer: FC<
  DataGridCellValueElementProps & {
    services: ProfileProviderServices;
    density: DataGridDensity | undefined;
    isDetails: boolean;
  }
> = ({ services, row, columnId, density, setCellProps, isDetails }) => {
  const { euiTheme } = useEuiTheme();
  const comparison = useContext(SparklineComparisonContext);
  const isSelected =
    comparison !== undefined && row.flattened[comparison.column] === comparison.value;
  const cellPadding = getDataGridDensityPadding(euiTheme, density ?? DataGridDensity.COMPACT);

  // In the details view, the chart renders at a fixed height.
  // But needs to be made slightly taller to even the padding at the top and bottom.
  const detailsHeight = useMemo(
    () => mathWithUnits([euiTheme.size.xxxl, euiTheme.size.s], (xxxxl, s) => xxxxl + s),
    [euiTheme.size.xxxl, euiTheme.size.s]
  );

  useEffect(() => {
    setCellProps({
      css: {
        '.euiDataGridRowCell__content': {
          overflow: 'visible',
        },
      },
    });
  }, [cellPadding, setCellProps]);

  return (
    <>
      <div css={{ minHeight: euiTheme.size.xxxl }} />
      <div
        css={{
          position: 'absolute',
          inset: cellPadding,
          ...(isDetails && { height: detailsHeight, bottom: 'auto' }),
        }}
      >
        <SparklineRenderer
          charts={services.charts}
          values={row.flattened[columnId]}
          isSelected={isSelected}
        />
      </div>
    </>
  );
};
