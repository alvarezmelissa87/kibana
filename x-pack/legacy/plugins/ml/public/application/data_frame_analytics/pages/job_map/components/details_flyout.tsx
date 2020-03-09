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
import { EuiTitle, EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
// import { CytoscapeContext } from './cytoscape';

interface Props {
  children: any;
  closeFlyout: any;
  analyticsId: string;
}

export const DetailsFlyout: FC<Props> = ({ children, closeFlyout, analyticsId }) => {
  return (
    <EuiFlyout size="m" onClose={closeFlyout} data-test-subj="mlAnalyticsJobMapFlyout">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="mlDataFrameAnalyticsNodeDetailsTitle">
            {i18n.translate('xpack.ml.dataframe.analytics.analyticsMap.flyoutHeaderTitle', {
              defaultMessage: 'Node details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
