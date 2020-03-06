/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
// import { FormattedMessage } from '@kbn/i18n/react';
// import { i18n } from '@kbn/i18n';
import {
  // EuiBetaBadge,
  // EuiPage,
  // EuiPageBody,
  // EuiTitle,
  // EuiPageHeader,
  // EuiPageHeaderSection,
  // EuiFlyout,
  // EuiFlyoutHeader,
  // EuiFlyoutBody,
  // EuiButton,
  EuiText,
  // EuiTitle,
} from '@elastic/eui';
import { CytoscapeContext } from './cytoscape';
import { DetailsFlyout } from './details_flyout';

interface Props {
  analyticsId: string;
}

export const Controls: FC<Props> = ({ analyticsId }) => {
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | undefined>(undefined);

  const cy = useContext(CytoscapeContext);
  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setShowFlyout(false);
    setSelectedNode(undefined);
  }, [cy, setSelectedNode]);

  const nodeId = selectedNode?.data('id');

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      setSelectedNode(event.target);
      setShowFlyout(true);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      // cy.on('data viewport', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        // cy.removeListener('data viewport', undefined, deselect);
      }
    };
  }, [cy, deselect]);

  if (showFlyout === false) {
    return null;
  }

  return (
    <>
      <DetailsFlyout analyticsId={analyticsId} closeFlyout={() => setShowFlyout(false)}>
        <EuiText>{nodeId}</EuiText>
        <EuiText>More details</EuiText>
      </DetailsFlyout>
    </>
  );
};
