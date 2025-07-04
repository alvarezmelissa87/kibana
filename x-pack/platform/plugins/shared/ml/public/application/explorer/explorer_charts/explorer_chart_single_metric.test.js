/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartData as mockChartData } from './__mocks__/mock_chart_data';
import seriesConfig from './__mocks__/mock_series_config_filebeat.json';

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';

import { ExplorerChartSingleMetric } from './explorer_chart_single_metric';
import { timeBucketsMock } from '../../util/__mocks__/time_buckets';
import { kibanaContextMock } from '../../contexts/kibana/__mocks__/kibana_context';
import { BehaviorSubject } from 'rxjs';

const utilityProps = {
  timeBuckets: timeBucketsMock,
  chartTheme: kibanaContextMock.services.charts.theme.useChartsBaseTheme(),
  onPointerUpdate: jest.fn(),
  cursor$: new BehaviorSubject({ isDataHistorgram: true, cursor: { x: 10432423 } }),
  euiTheme: {
    colors: {
      lightestShade: '#F5F7FA',
    },
  },
};

describe('ExplorerChart', () => {
  const mlSelectSeverityServiceMock = {
    state: {
      get: () => ({
        val: '',
      }),
    },
  };

  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => (SVGElement.prototype.getBBox = () => mockedGetBBox));
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Initialize', () => {
    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    const { container } = render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <ExplorerChartSingleMetric
              mlSelectSeverityService={mlSelectSeverityServiceMock}
              tooltipService={mockTooltipService}
              severity={[{ min: 0, max: 100 }]}
              {...utilityProps}
            />
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );

    // without setting any attributes and corresponding data
    // the directive just ends up being empty.
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('.content-wrapper')).toBeNull();
    expect(container.querySelector('.euiLoadingChart')).toBeNull();
  });

  test('Loading status active, no chart', () => {
    const config = {
      loading: true,
    };

    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    const { container } = render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <ExplorerChartSingleMetric
              seriesConfig={config}
              mlSelectSeverityService={mlSelectSeverityServiceMock}
              tooltipService={mockTooltipService}
              severity={[{ min: 0, max: 100 }]}
              {...utilityProps}
            />
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );

    // test if the loading indicator is shown
    // Added span because class appears twice with classNames and Emotion
    expect(container.querySelector('span.euiLoadingChart')).toBeInTheDocument();
  });

  // For the following tests the directive needs to be rendered in the actual DOM,
  // because otherwise there wouldn't be a width available which would
  // trigger SVG errors. We use a fixed width to be able to test for
  // fine grained attributes of the chart.

  // basically a parameterized beforeEach
  function init(chartData) {
    const config = {
      ...seriesConfig,
      chartData,
      chartLimits: { min: 201039318, max: 625736376 },
    };

    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    // We create the element including a wrapper which sets the width:
    return render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <div style={{ width: '500px' }}>
              <ExplorerChartSingleMetric
                seriesConfig={config}
                mlSelectSeverityService={mlSelectSeverityServiceMock}
                tooltipService={mockTooltipService}
                severity={[{ min: 0, max: 100 }]}
                {...utilityProps}
              />
            </div>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );
  }

  it('Anomaly Explorer Chart with multiple data points', () => {
    const { container } = init(mockChartData);

    // the loading indicator should not be shown
    expect(container.querySelector('.euiLoadingChart')).toBeNull();

    // test if all expected elements are present
    // chart is not rendered via react itself, so we need to query the DOM directly
    const svg = container.getElementsByTagName('svg');
    expect(svg).toHaveLength(1);

    const lineChart = svg[0].getElementsByClassName('line-chart');
    expect(lineChart).toHaveLength(1);

    const rects = lineChart[0].getElementsByTagName('rect');
    expect(rects).toHaveLength(3);

    const chartBorder = rects[0];
    expect(+chartBorder.getAttribute('x')).toBe(0);
    expect(+chartBorder.getAttribute('y')).toBe(0);
    expect(+chartBorder.getAttribute('height')).toBe(170);

    const selectedInterval = rects[1];
    expect(selectedInterval.getAttribute('class')).toBe('selected-interval');
    expect(+selectedInterval.getAttribute('y')).toBe(2);
    expect(+selectedInterval.getAttribute('height')).toBe(166);

    const xAxisTicks = container.querySelector('.x').querySelectorAll('.tick');
    expect([...xAxisTicks]).toHaveLength(8);
    const yAxisTicks = container.querySelector('.y').querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(10);

    const paths = container.querySelectorAll('path');
    expect(paths[0].getAttribute('class')).toBe('domain');
    expect(paths[1].getAttribute('class')).toBe('domain');
    expect(paths[2].getAttribute('class')).toBe('values-line');
    expect(paths[2].getAttribute('d')).toBe(
      'M-19.090909090909093,159.33024504444444ZM-20,9.166257955555556L-20.22727272727273,169.60736875555557'
    );

    const dots = container.querySelector('.values-dots').querySelectorAll('circle');
    expect([...dots]).toHaveLength(1);
    expect(dots[0].getAttribute('r')).toBe('1.5');

    const chartMarkers = container.querySelector('.chart-markers').querySelectorAll('circle');
    expect([...chartMarkers]).toHaveLength(4);
    expect([...chartMarkers].map((d) => +d.getAttribute('r'))).toEqual([7, 7, 7, 7]);
  });

  // TODO chart limits provided by the endpoint, mock data needs to be updated.
  it.skip('Anomaly Explorer Chart with single data point', () => {
    const chartData = [
      {
        date: new Date('2017-02-23T08:00:00.000Z'),
        value: 228243469,
        anomalyScore: 63.32916,
        numberOfCauses: 1,
        actual: [228243469],
        typical: [228243469],
      },
    ];

    const { container } = init(chartData);

    const yAxisTicks = container.querySelector('.y').querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(13);
  });
});
