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

import React, { FC } from 'react';
// import cytoscape from 'cytoscape';
// import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  // EuiBetaBadge,
  // EuiPage,
  // EuiPageBody,
  EuiTitle,
  // EuiPageHeader,
  // EuiPageHeaderSection,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  // EuiFlyoutFooter,
  // EuiButton,
  // EuiText,
  // EuiTitle,
} from '@elastic/eui';
// import { CytoscapeContext } from './cytoscape';

interface Props {
  children: any;
  closeFlyout: any;
  jobId: string;
}

export const DetailsFlyout: FC<Props> = ({ children, closeFlyout, jobId }) => {
  return (
    <EuiFlyout size="s" onClose={closeFlyout} data-test-subj="mlAnalyticsJobMapFlyout">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="mlDataFrameAnalyticsNodeDetailsTitle">
            {i18n.translate('xpack.ml.dataframe.analytics.jobMap.flyoutHeaderTitle', {
              defaultMessage: 'Node details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
