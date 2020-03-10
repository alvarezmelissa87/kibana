/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { i18n } from '@kbn/i18n';
import { EuiCodeEditor, EuiText } from '@elastic/eui';
import { CytoscapeContext } from './cytoscape';
import { DetailsFlyout } from './details_flyout';

interface Props {
  details: any;
}

export const Controls: FC<Props> = ({ details }) => {
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

  // Set up Cytoscape event handlers
  // const nodes = cytoscape({ elements }).nodes();
  // const unconnectedNodes = nodes.roots().intersection(nodes.leaves());
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      // if (cy) {
      //   // cy.nodes().roots()[0].data('id')
      //   // if it's not the current analyticsID and it's type is 'analytics' we can try and fetch other jobs
      //   TODO: access node data from event.target/selectedNode to create link to job and if ^^ do a fetch for more elements
      //   then that will add to 'elements' which will trigger the 'data' and cause an add in Cytoscape component
      // }
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

  return (
    <>
      <DetailsFlyout closeFlyout={() => setShowFlyout(false)}>
        <EuiText>{nodeLabel}</EuiText>
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
