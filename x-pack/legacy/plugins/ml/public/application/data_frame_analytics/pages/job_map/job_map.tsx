/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';
import { Cytoscape, Controls } from './components';
import { ml } from '../../../services/ml_api_service';
import { getToastNotifications } from '../../../util/dependency_cache';

export const JobMapTitle: React.FC<{ analyticsId: string }> = ({ analyticsId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.map.analyticsIdTitle', {
        defaultMessage: 'Map for analytics ID {analyticsId}',
        values: { analyticsId },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  analyticsId: string;
  jobStatus: any;
}

export const JobMap: FC<Props> = ({ analyticsId, jobStatus }) => {
  const toastNotifications = getToastNotifications();
  const [elements, setElements] = useState([]);
  const [nodeDetails, setNodeDetails] = useState({});
  const [error, setError] = useState(undefined);

  const getData = async () => {
    const analyticsMap = await ml.dataFrameAnalytics.getDataFrameAnalyticsMap(analyticsId);
    const { elements: nodeElements, details, error: fetchError } = analyticsMap;

    if (fetchError !== null) {
      setError(fetchError);
    }

    if (nodeElements && nodeElements.length > 0) {
      setElements(nodeElements);
      setNodeDetails(details);
    }
  };

  useEffect(() => {
    getData();
  }, [analyticsId]);

  if (error !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsMap.fetchDataErrorMessage', {
        defaultMessage: 'Unable to fetch some data. An error occurred: {error}',
        values: { error: JSON.stringify(error) },
      })
    );
  }

  return (
    <div>
      <JobMapTitle analyticsId={analyticsId} />
      <Cytoscape height={800} elements={elements}>
        <Controls details={nodeDetails} />
      </Cytoscape>
    </div>
  );
};
