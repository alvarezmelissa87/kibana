/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import React from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiIcon } from '@elastic/eui';

const lineColor = '#C5CCD7';

function shapeForNode(el: cytoscape.NodeSingular) {
  const type = el.data('type');
  switch (type) {
    case 'analytics':
      return 'ellipse';
    case 'transform':
      return 'rectangle';
    case 'index-pattern':
      return 'diamond';
    default:
      return 'ellipse';
  }
}

function iconForNode(el: cytoscape.NodeSingular) {
  const type = el.data('type');
  switch (type) {
    case 'analytics':
      return <EuiIcon type={'machineLearningApp'} size="s" />;
    case 'transform':
      return <EuiIcon type={'indexManagementApp'} size="s" />;
    case 'index-pattern':
      return <EuiIcon type={'indexPatternApp'} size="s" />;
    default:
      return 'ellipse';
  }
}

export const cytoscapeOptions: cytoscape.CytoscapeOptions = {
  autoungrabify: true,
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  // @ts-ignore
  style: [
    {
      selector: 'node',
      style: {
        'background-color': 'white',
        'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        'background-height': '60%',
        'background-width': '60%',
        'border-color': (el: cytoscape.NodeSingular) =>
          el.selected() ? theme.euiColorPrimary : theme.euiColorMediumShade,
        'border-width': 2,
        color: theme.textColors.default,
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.euiFontSizeXS,
        'min-zoomed-font-size': theme.euiSizeL,
        label: 'data(label)',
        shape: (el: cytoscape.NodeSingular) => shapeForNode(el),
        'text-background-color': theme.euiColorLightestShade,
        'text-background-opacity': 0,
        'text-background-padding': theme.paddingSizes.xs,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': theme.paddingSizes.s,
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'taxi',
        // @ts-ignore
        'taxi-direction': 'rightward',
        'line-color': lineColor,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': 'triangle',
        'target-distance-from-node': theme.paddingSizes.xs,
        width: 1,
        'source-arrow-shape': 'none',
      },
    },
  ],
};
