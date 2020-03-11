/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCodeEditor, EuiText } from '@elastic/eui';
import { CytoscapeContext } from './cytoscape';
import { DetailsFlyout } from './details_flyout';
import { JOB_MAP_NODE_TYPES } from '../common';

interface Props {
  analyticsId: string;
  details: any;
  getNodeData: any;
}

export const Controls: FC<Props> = ({ analyticsId, details, getNodeData }) => {
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
  const nodeLabel = selectedNode?.data('label');
  const nodeType = selectedNode?.data('type');

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

  // @ts-ignore
  const content = JSON.stringify(details[nodeId], null, 2);

  const nodeDataButtonHandler = () => {
    getNodeData(nodeLabel);
    setShowFlyout(false);
  };

  const nodeDataButton =
    analyticsId !== nodeLabel && nodeType === JOB_MAP_NODE_TYPES.ANALYTICS ? (
      <EuiButton onClick={nodeDataButtonHandler} iconType="branch">
        {i18n.translate('xpack.ml.dataframe.analytics.jobMap.flyout.fetchRelatedNodesButton', {
          defaultMessage: 'Fetch related nodes',
        })}
      </EuiButton>
    ) : null;

  return (
    <>
      <DetailsFlyout closeFlyout={() => setShowFlyout(false)}>
        <EuiText>{nodeLabel}</EuiText>
        <EuiText>{nodeType}</EuiText>
        {nodeDataButton}
        <EuiCodeEditor
          mode="json"
          width="100%"
          value={content}
          setOptions={{
            fontSize: '12px',
          }}
          theme="textmate"
          isReadOnly
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.jobMap.flyout.codeEditorAriaLabel',
            {
              defaultMessage: 'Advanced analytics job editor',
            }
          )}
        />
      </DetailsFlyout>
    </>
  );
};
