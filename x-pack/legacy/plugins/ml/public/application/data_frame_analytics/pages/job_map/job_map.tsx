/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
// import { FormattedMessage } from '@kbn/i18n/react';
// import { i18n } from '@kbn/i18n';
// import { EuiBetaBadge } from '@elastic/eui';
import { Cytoscape, Controls } from './components';

const elements = [
  {
    data: {
      id: 'opbeans-python',
      label: 'opbeans-python',
      agentName: 'python',
      type: 'service',
    },
  },
  {
    data: {
      id: 'opbeans-node',
      label: 'opbeans-node',
      agentName: 'nodejs',
      type: 'service',
    },
  },
  {
    data: {
      id: 'new-thing',
      label: 'new-thing',
      agentName: 'nodejs',
      type: 'service',
    },
  },
  {
    data: {
      id: 'opbeans-ruby',
      label: 'opbeans-ruby',
      agentName: 'ruby',
      type: 'service',
    },
  },
  { data: { source: 'opbeans-python', target: 'opbeans-node' } },
  { data: { source: 'opbeans-node', target: 'new-thing' } },
  {
    data: {
      bidirectional: true,
      source: 'opbeans-python',
      target: 'opbeans-ruby',
    },
  },
];

interface Props {
  jobId: string;
  jobStatus: any;
}

export const JobMap: FC<Props> = ({ jobId, jobStatus }) => {
  return (
    <div>
      <Cytoscape height={500} elements={elements}>
        <Controls jobId={jobId} />
      </Cytoscape>
    </div>
  );
};
